---
title: "Project Reactor: Mono & Flux Basics"
description: "Lesson 47: Project Reactor: Mono & Flux Basics"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/08-reactor-pattern/0047-reactor-mono-flux.md
---

# Project Reactor: Mono & Flux Basics

Project Reactor is the Reactive Streams implementation that powers Spring WebFlux. It gives you two publisher types (`Mono` for zero-or-one results, `Flux` for zero-to-many) and a toolkit of static factories to create them. This lesson covers what each type models and how to build publishers from scratch.

## Mono <T>: Zero or One Item

A `Mono<T>` emits **at most one item**, then completes. It also may emit nothing (complete empty) or signal an error. Think of it as the reactive equivalent of a `Optional<T>` that can also fail.

Typical uses: find by ID, save a single record, an HTTP call returning one response.

```
Mono<String> greeting = Mono.just("Hello");
Mono<String> nothing = Mono.empty();
Mono<String> failed = Mono.error(new RuntimeException("boom"));
```

## Flux <T>: Zero to N Items

A `Flux<T>` emits **zero or more items**, then completes or errors. It can be finite (a list of 10 orders) or infinite (a stream of Kafka messages that never ends).

Typical uses: list all records, a Kafka topic stream, WebSocket messages, timed ticks.

```
Flux<Integer> three = Flux.just(1, 2, 3);
Flux<Integer> range = Flux.range(1, 10);
Flux<Long> ticks = Flux.interval(Duration.ofSeconds(1));
```

Both `Mono` and `Flux` implement the `Publisher` interface from the Reactive Streams spec. The difference is cardinality, and that cardinality shapes how you compose operators downstream.

## Mono vs Flux: When to Use Each

| Type | Cardinality | Analogy | Use When |
| --- | --- | --- | --- |
| `Mono` | 0 or 1 | A ticket booth: one ticket or "sold out" | Single-record lookup, save, HTTP response |
| `Flux` | 0 to N | A train line: trains keep arriving | Collections, streams, events, infinite sources |

A `Flux` that emits one item is legal but semantically misleading. If the domain models a single result, use `Mono`. It communicates intent and gives you type-specific operators like `.defaultIfEmpty()`.

## Static Factory Methods

### Mono Factories

| Factory | Emits | When to Use |
| --- | --- | --- |
| `Mono.just(value)` | One item immediately | You already have the value |
| `Mono.empty()` | Nothing; completes immediately | No result (e.g., `Mono<Void>`) |
| `Mono.error(Throwable)` | Nothing; signals an error | Immediately fail the pipeline |
| `Mono.fromCallable(Callable)` | Result of a blocking/synchronous call | Wrap blocking I/O so it runs on a scheduler |
| `Mono.fromSupplier(Supplier)` | Result of a lazy computation | Same as `fromCallable` without checked exceptions |
| `Mono.fromRunnable(Runnable)` | Nothing; runs side effect, then completes | Fire-and-forget actions, then `.then()` |

### Flux Factories

| Factory | Emits | When to Use |
| --- | --- | --- |
| `Flux.just(values...)` | Each argument as a separate emission | A handful of known values |
| `Flux.fromIterable(Iterable)` | Each element of the collection | Convert an existing list/set |
| `Flux.range(start, count)` | `start`, `start+1`, … `start+count-1` | Numeric sequences, loop replacements |
| `Flux.interval(Duration)` | 0L, 1L, 2L, … at fixed intervals (infinite) | Ticking clock, polling, scheduled emissions |
| `Flux.empty()` | Nothing; completes immediately | Conditional empty stream |
| `Flux.error(Throwable)` | Nothing; signals an error | Immediately fail the pipeline |

## Code Example: Creating Publishers

```
package com.example.ordermgmt.reactive;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

public class PublisherDemo {

    // Mono: one value
    public Mono<String> singleGreeting() {
        return Mono.just("Hello, Reactive World!");
    }

    // Mono: wrap a blocking call
    public Mono<Integer> computeAsync() {
        return Mono.fromCallable(() -> {
            Thread.sleep(100);   // simulate blocking work
            return 42;
        });
    }

    // Flux: finite range
    public Flux<Integer> numbers() {
        return Flux.range(1, 10);
    }

    // Flux: from a collection
    public Flux<String> fromList() {
        return Flux.fromIterable(List.of("apple", "banana", "cherry"));
    }

    // Flux: infinite tick stream, limited with take()
    public Flux<Long> ticker() {
        return Flux.interval(Duration.ofSeconds(1))
                .take(5);  // stop after 5 emissions
    }

    // Mono: side-effect with no return value
    public Mono<Void> logEvent(String event) {
        return Mono.fromRunnable(() ->
                System.out.println("Event: " + event))
            .then();  // converts to Mono<Void>
    }
}
```

## Key Pitfall: `Mono.just(null)` vs `Mono.empty()`

This is the most common beginner mistake. `Mono.just(null)` **emits a `null` value downstream**. It does *not* produce an empty publisher. Downstream operators like `.map()` will receive `null` and likely throw a `NullPointerException`. If you mean "no value," use `Mono.empty()`.

```
// WRONG: emits null, likely causes NPE downstream
Mono<String> bad = Mono.just(null);

// RIGHT: completes with no value
Mono<String> good = Mono.empty();
```

`Mono.just()` is **eager**: the value is captured at construction time. If you need lazy evaluation (the value is computed only when someone subscribes), use `Mono.fromSupplier()` instead.

```
// Eager: UUID captured immediately when this line runs
Mono<String> eager = Mono.just(UUID.randomUUID().toString());

// Lazy: UUID generated only on subscription
Mono<String> lazy = Mono.fromSupplier(() ->
        UUID.randomUUID().toString());
```

## Converting Between Mono and Flux

A `Flux` can be reduced to a `Mono`; a `Mono` can be expanded to a `Flux`:

```
// Flux → Mono (collect all items into a list)
Mono<List<String>> list = Flux.just("a", "b", "c")
        .collectList();

// Mono → Flux (expand one item)
Flux<String> expanded = Mono.just("hello")
        .flux();
```

Use `.collectList()` when downstream needs all items at once. Use `.flux()` when an API expects a `Flux` but you have a single value.

**Primary sources:** [Project Reactor Reference](https://projectreactor.io/docs/core/release/reference/) · [Mono Javadoc](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Mono.html) · [Flux Javadoc](https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Flux.html)

## Check your understanding

<details>
<summary>1. You write Mono.just(null) expecting an empty publisher. What actually happens?</summary>
<p><strong>Correct answer:</strong> It emits a null value downstream, likely causing a NullPointerException</p>
</details>

<details>
<summary>2. Mono.just(UUID.randomUUID()) runs at construction time. How do you defer the UUID generation to subscription time?</summary>
<p><strong>Correct answer:</strong> Mono.fromSupplier(() -&gt; UUID.randomUUID())</p>
</details>

<details>
<summary>3. Which factory creates an infinite stream of increasing Long values at regular intervals?</summary>
<p><strong>Correct answer:</strong> Flux.interval(Duration.ofSeconds(1))</p>
</details>

<details>
<summary>4. You have a Flux of 100 items and need all of them collected into a List wrapped in a Mono. Which operator does this?</summary>
<p><strong>Correct answer:</strong> .collectList()</p>
</details>

<details>
<summary>5. Mono.fromCallable(() -> repository.findById(id)) wraps a blocking call. What happens if you subscribe to this Mono on the event loop thread of a WebFlux server?</summary>
<p><strong>Correct answer:</strong> The blocking call runs on the event loop thread, potentially starving other requests</p>
</details>
