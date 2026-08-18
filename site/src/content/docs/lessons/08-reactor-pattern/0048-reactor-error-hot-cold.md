---
title: "Lesson 48: Error Handling, Hot vs Cold Publishers"
description: "Lesson 48: Error Handling, Hot vs Cold Publishers"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0048-reactor-error-hot-cold.html
---

# Error Handling, Hot vs Cold Publishers

A reactive pipeline without error handling fails silently when errors hit. Reactor treats errors as **first-class signals**, just like `onNext` and `onComplete`, and gives you operators to recover, retry, or gracefully degrade. This lesson also covers the distinction between **cold** publishers (lazy, per-subscriber) and **hot** publishers (eager, shared), and why *nothing happens until you subscribe*.

## The Error Signal in the Reactive Contract

Every `Mono` and `Flux` follows a strict lifecycle: `onNext` emits data, `onComplete` signals success, and `onError` signals failure. Once `onError` fires, the stream is **done**. No more `onNext` calls, no `onComplete`. If you don't handle the error, it propagates to the subscriber and may terminate the entire pipeline.

```
Flux<String> orders = Flux.just("ORD-1", "ORD-2")
    .map(id -> {
        if (id.equals("ORD-2")) throw new RuntimeException("DB down");
        return id + " fetched";
    });
// Subscribing without error handling → onComplete never fires,
// the error propagates as an unhandled signal
```

The fix isn't a try-catch around the pipeline. The pipeline is a *declaration*, not an execution. The fix is an operator.

## onErrorReturn: Static Fallback

`onErrorReturn(T)` replaces an error with a single fallback value, then completes the stream normally. Use it when the error is recoverable and the fallback is a sensible default.

```
Mono<String> orderStatus = fetchStatus(orderId)
    .onErrorReturn("UNKNOWN");

// If fetchStatus errors, the subscriber receives "UNKNOWN" and onComplete fires
```

**Trap:** `onErrorReturn` swallows the error, so you lose the exception details. If you need to log it, chain `doOnError()` *before* `onErrorReturn`.

```
Mono<String> orderStatus = fetchStatus(orderId)
    .doOnError(e -> log.warn("Status fetch failed for {}", orderId, e))
    .onErrorReturn("UNKNOWN");
```

## onErrorResume: Dynamic Fallback

`onErrorResume(Function<Throwable, Publisher>)` replaces the error with an entirely new `Mono` or `Flux`. Use it when the fallback depends on the error type, or when you need to switch to an alternative data source.

```
Mono<OrderResponse> order = orderRepository.findById(id)
    .map(OrderResponse::from)
    .onErrorResume(WebClientException.class, e -> {
        log.error("External service down", e);
        return orderCache.findById(id).map(OrderResponse::from);
    })
    .onErrorResume(Exception.class, e ->
        Mono.just(new OrderResponse(id, "SERVICE_UNAVAILABLE", null))
    );
```

Notice the two `onErrorResume` calls: the first catches a specific exception type, the second catches everything else. Reactor tries them in order. The first matching handler wins.

## retry and retryWhen: Try Again

`retry(long n)` re-subscribes to the source up to *n* times. Each retry creates a fresh subscription, and the entire pipeline re-executes from scratch. Use `retry` for transient failures (network blips, temporary timeouts).

```
Mono<String> result = webClient.get()
    .uri("/api/pricing")
    .retrieve()
    .bodyToMono(String.class)
    .retry(3);  // up to 3 attempts after the initial failure
```

**Trap:** `retry(3)` retries immediately, with no delay. For external services, this hammers a struggling server. Use `retryWhen` with `Retry.backoff()` instead:

```
Mono<String> result = webClient.get()
    .uri("/api/pricing")
    .retrieve()
    .bodyToMono(String.class)
    .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
        .maxBackoff(Duration.ofSeconds(10))
        .filter(e -> e instanceof WebApiClientException))
    .onErrorResume(e -> Mono.just("cached-price"));
```

`Retry.backoff(3, Duration.ofSeconds(1))` retries with exponential delay: 1s, 2s, 4s. The `.filter()` limits retries to specific exception types. If all retries fail, the error still propagates, hence the `onErrorResume` as a final safety net.

## Error Operator Quick Reference

| Operator | Effect | When to Use |
| --- | --- | --- |
| `onErrorReturn(T)` | Replace error with a static value | Simple default; error details don't matter |
| `onErrorResume(fn)` | Replace error with a fallback Publisher | Dynamic fallback; error-type-dependent recovery |
| `retry(n)` | Re-subscribe up to n times, no delay | Transient failures; idempotent operations |
| `retryWhen(Retry)` | Re-subscribe with custom strategy | Exponential backoff; filtered retries |
| `doOnError(fn)` | Side effect (logging); error still propagates | Observability, never for recovery |
| `onErrorMap(fn)` | Transform one exception into another | Translate infrastructure errors to domain errors |

## Cold Publishers: Lazy and Per-Subscriber

A **cold** publisher generates data *fresh for each subscriber*. Nothing executes until someone calls `.subscribe()`. The pipeline is a blueprint, not a running process. Each subscriber triggers an independent execution from the beginning.

```
Flux<Integer> cold = Flux.range(1, 3)
    .doOnNext(n -> System.out.println("Produced: " + n));

cold.subscribe(n -> System.out.println("Sub A: " + n));
// Produces 1, 2, 3 → Sub A receives 1, 2, 3

cold.subscribe(n -> System.out.println("Sub B: " + n));
// Produces 1, 2, 3 AGAIN → Sub B receives 1, 2, 3
```

Most Reactor factories create cold publishers: `Flux.just()`, `Flux.range()`, `Flux.fromIterable()`, `Mono.fromCallable()`. This is the default behavior, and it's what you want most of the time. Cold means predictable: every subscriber sees the same complete sequence.

## Hot Publishers: Eager and Shared

A **hot** publisher emits data regardless of whether anyone is listening. Late subscribers only receive items emitted *after* they subscribe. Earlier items are gone. Think of a radio broadcast: if you tune in late, you miss the opening.

```
Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
Flux<String> hot = sink.asFlux();

sink.tryEmitNext("event-1");  // no subscribers yet, item buffered

hot.subscribe(s -> System.out.println("Sub A: " + s));
sink.tryEmitNext("event-2");  // Sub A prints "event-2"

hot.subscribe(s -> System.out.println("Sub B: " + s));
sink.tryEmitNext("event-3");  // Sub A and Sub B both print "event-3"
// Sub B never sees "event-1" or "event-2"
```

Hot publishers are the right choice when the data source is genuinely live: stock prices, sensor readings, Kafka topic consumption, server-sent events. Wasting resources re-running the source for each subscriber would be incorrect.

## Converting Cold to Hot

Sometimes you need to share a single cold-source execution across multiple subscribers. Reactor provides `.share()` and `.replay()` for this:

```
// Cold source wrapped as hot: one execution, shared by all subscribers
Flux<OrderStatus> shared = orderEvents.share();

// Hot with replay: new subscribers get the last 5 items, then live data
Flux<OrderStatus> replayed = orderEvents.replay(5).refCount();
```

`.share()` turns a cold Flux into a hot one: the first subscriber triggers the source, subsequent subscribers ride along. When the last subscriber disconnects, the source subscription is cancelled. `.replay(N).refCount()` does the same but replays the last N items to late arrivals, bridging the gap between cold and hot.

## Sinks: Pushing Data Manually

When you need full control over what gets emitted and when, `Sinks` replaces the deprecated `Processor` types. A `Sinks.Many<T>` lets you call `tryEmitNext()` from anywhere in your code:

```
public class OrderStatusPublisher {
    private final Sinks.Many<OrderStatusUpdate> sink =
        Sinks.many().multicast().onBackpressureBuffer();

    public void publish(OrderStatusUpdate update) {
        Sinks.EmitResult result = sink.tryEmitNext(update);
        if (result.isFailure()) {
            log.warn("Failed to emit: {}", result);
        }
    }

    public Flux<OrderStatusUpdate> stream() {
        return sink.asFlux();
    }
}
```

`tryEmitNext()` is non-blocking and returns a result you must check. Unlike the deprecated `Processor`, which could silently drop items or throw, `Sinks` makes the outcome explicit.

## Nothing Happens Until Subscribe

This is the most counterintuitive part of Reactor for imperative programmers. A pipeline like this does **exactly nothing**:

```
Mono<String> unused = webClient.get()
    .uri("/api/orders/1")
    .retrieve()
    .bodyToMono(String.class)
    .doOnNext(body -> log.info("Got: {}", body));
// No HTTP request is made. No log line is printed. Nothing happens.
```

The variable `unused` holds a *description* of what to do, not the result of doing it. Only when something calls `.subscribe()`, `.block()`, or the pipeline is returned from a Spring WebFlux controller does execution begin. This is the core design of Reactor. It lets you compose, transform, and pass around pipelines without triggering side effects.

**Common mistake:** building a pipeline in a method and forgetting to subscribe or return it. The compiler won't warn you. The `Mono`/`Flux` is a valid object. The only symptom is that nothing happens at runtime.

**Primary sources:** [Project Reactor Reference](https://projectreactor.io/docs/core/release/reference/) · [Flux Javadoc](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Flux.html) · [Mono Javadoc](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Mono.html) · [Reactive Streams Specification](https://www.reactive-streams.org/)

## Check your understanding

<details>
<summary>1. A Flux.range(1, 5) is subscribed to by two separate subscribers. How many total items does the source produce?</summary>
<p><strong>Correct answer:</strong> 10, each subscriber triggers an independent execution producing 5 items</p>
</details>

<details>
<summary>2. You call .doOnError(e -> log.warn("Failed", e)).onErrorReturn("fallback"). What happens when the source emits an error?</summary>
<p><strong>Correct answer:</strong> The error is logged, then replaced with "fallback", and the stream completes normally</p>
</details>

<details>
<summary>3. A hot publisher emits items A, B, C. A subscriber connects after B is emitted. What does it receive?</summary>
<p><strong>Correct answer:</strong> C only, late subscribers miss items emitted before they connected</p>
</details>

<details>
<summary>4. You build a Mono pipeline with .map() and .doOnNext() but never call .subscribe() or return it from a controller. What happens at runtime?</summary>
<p><strong>Correct answer:</strong> Nothing, the pipeline is a declaration; without subscription, no code runs</p>
</details>

<details>
<summary>5. Why is retry(3) dangerous when calling an external HTTP service?</summary>
<p><strong>Correct answer:</strong> It retries immediately with no delay, potentially hammering a struggling service</p>
</details>
