---
title: "Reactive Streams Spec: Publisher, Subscriber, Backpressure"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/08-reactor-pattern/0046-reactive-streams-spec.md
---

Before learning any specific library (Reactor, RxJava, Mutiny), you need the **Reactive Streams specification**: a contract that defines how asynchronous stream processing must work. Every compliant library implements the same four interfaces. Understand the spec once, and the concepts transfer everywhere.

## The Four Interfaces

The spec defines four core interfaces in Java (but the contract is language-agnostic):

```
// A provider of a potentially unbounded number of sequenced elements
public interface Publisher<T> {
    void subscribe(Subscriber<? super T> subscriber);
}

// A consumer of elements from a Publisher
public interface Subscriber<T> {
    void onSubscribe(Subscription subscription);
    void onNext(T item);
    void onError(Throwable error);
    void onComplete();
}

// A link between Publisher and Subscriber that controls demand
public interface Subscription {
    void request(long n);    // Request n more items
    void cancel();           // Cancel the subscription
}

// A processor that acts as both Subscriber and Publisher
public interface Processor<T, R> extends Subscriber<T>, Publisher<R> {
}
```

`Publisher` produces data. `Subscriber` consumes it. `Subscription` is the control channel between them: it carries demand signals. `Processor` is a transformation stage that sits in the middle, subscribing upstream and publishing downstream.

## The Lifecycle Contract

When a `Subscriber` subscribes to a `Publisher`, the calls follow a strict sequence:

```
Publisher              Subscriber
   |---subscribe()------>|
   |<--onSubscribe()-----|  (Publisher hands back a Subscription)
   |<--request(n)--------|  (Subscriber signals demand)
   |---onNext(item)----->|  (repeated, up to n items)
   |<--request(n)--------|  (Subscriber requests more)
   |---onNext(item)----->|  (repeated)
   |---onComplete()----->|  OR  |---onError(t)--->|
```

Key rules enforced by the spec:

1.  **`onSubscribe` is called exactly once** before any other signal.
2.  **`onNext` is never called after `onComplete` or `onError`.** Terminal signals are final.
3.  **A `Subscription` must be cancelled** if the `Subscriber` no longer wants items.
4.  **Calls are non-interfering**: `onNext` on subscriber A does not block subscriber B.
5.  **`request(n)` controls demand**: the Publisher *must not* send more items than requested.

Notice the asymmetry: the `Subscriber` initiates *both* the subscription and the demand. The `Publisher` never pushes unsolicited data. This is the foundation of backpressure.

## Backpressure: The Push-Pull Model

**Backpressure** is the mechanism by which a `Subscriber` tells a `Publisher`: *"I can only handle N items at a time, don't send more than that."*

Without backpressure:

```
Fast Producer: [item1] [item2] [item3] [item4] [item5] → Slow Consumer
                                                        💥 buffer overflow
```

With backpressure:

```
Fast Producer: [item1] [item2] → Slow Consumer (request(2))
               (waits...)
              [item3] [item4] → Slow Consumer
               (waits...)
```

This is a **push-pull** model. The Publisher *pushes* items, but the Subscriber *pulls* by requesting a specific quantity. The Publisher must respect the demand signal. It cannot send more items than the total requested minus the already delivered.

A common mistake: calling `request(Long.MAX_VALUE)` effectively disables backpressure, turning the stream into an unbounded push model. Fine for testing, dangerous in production. It defeats the entire purpose of reactive streams.

## Backpressure Strategies

When a `Subscriber` cannot keep up, different libraries offer strategies for what happens to the excess items:

| Strategy | Behavior | Use Case |
| --- | --- | --- |
| **Buffer** | Store excess items in a queue | Items can be slightly delayed |
| **Drop** | Discard items the Subscriber can't process | Real-time metrics where missing data is OK |
| **Latest** | Keep only the most recent item | Live price feeds, sensor data |
| **Error** | Signal an error when overwhelmed | Data loss is unacceptable |
| **Block** | Block the producer thread | Legacy integration (anti-pattern in reactive) |

These strategies are library-specific, but the demand-driven contract (`request(n)`) is universal, guaranteed by the spec.

## Implementations of the Spec

The Reactive Streams spec is language-agnostic. All of these implement the same interfaces:

| Implementation | Language | Used For |
| --- | --- | --- |
| **Project Reactor** | Java (JVM) | Spring WebFlux, Spring Data R2DBC |
| **RxJava** | Java (JVM) | Android, general JVM apps |
| **Mutiny** | Java (JVM) | Quarkus |
| **akka-streams** | Scala (JVM) | Akka ecosystem |
| **Kotlin Flow** | Kotlin | Coroutines + Flow (Kotlin's native reactive) |

The spec guarantees interoperability: a `Publisher` from Reactor can feed a `Subscriber` from RxJava, because they share the same contract.

**Primary sources:** [Reactive Streams Specification](https://www.reactive-streams.org/) · [Reactive Streams JVM (GitHub)](https://github.com/reactive-streams/reactive-streams-jvm) · [Spring WebFlux Reference](https://docs.spring.io/spring-framework/reference/web/webflux.html)

## Check your understanding

<details>
<summary>1. A Publisher emits 10 items to a Subscriber that has called request(3). How many items does the spec require the Publisher to send?</summary>
<p><strong>Correct answer:</strong> At most 3, the Publisher must not exceed the requested demand</p>
</details>

<details>
<summary>2. After a Subscriber receives onComplete(), can the Publisher subsequently call onNext() on that same Subscriber?</summary>
<p><strong>Correct answer:</strong> No: onComplete is a terminal signal; no onNext may follow</p>
</details>

<details>
<summary>3. A fast Kafka consumer pushes 1,000 events/second into a reactive pipeline, but the downstream database Subscriber can only persist 100/second. What does backpressure prevent?</summary>
<p><strong>Correct answer:</strong> Buffer overflow: the Subscriber signals demand, the Publisher holds excess</p>
</details>

<details>
<summary>4. A Subscriber calls request(Long.MAX_VALUE) on its Subscription. What is the practical effect?</summary>
<p><strong>Correct answer:</strong> Backpressure is effectively disabled: the Publisher pushes without restraint</p>
</details>

<details>
<summary>5. The Processor interface extends both Subscriber and Publisher. What is its role in a reactive pipeline?</summary>
<p><strong>Correct answer:</strong> It acts as a transformation stage: subscribing upstream, publishing transformed data downstream</p>
</details>
