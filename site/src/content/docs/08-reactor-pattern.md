---
title: "Module 08: Reactor Pattern"
description: "Reactor Pattern"
---

## What You'll Learn

- The **reactive programming paradigm** — data streams, asynchronous propagation, and non-blocking execution
- The **C10K problem** and why the industry moved toward reactive solutions
- The **Reactive Streams specification** — `Publisher`, `Subscriber`, `Subscription`, and the lifecycle contract
- **Backpressure** as a general concept — demand-driven flow control across any reactive library
- How different implementations (Reactor, RxJava, Mutiny, Kotlin Flow) implement the same spec
- **Project Reactor** — `Mono` and `Flux`, static factories, operators, schedulers
- Error handling strategies (`onErrorReturn`, `onErrorResume`, `retry`, `retryWhen`)
- **Hot vs. Cold publishers** and when to use each
- Building reactive REST endpoints with **Spring WebFlux** (built on top of Reactor)
- Connecting reactive streams to **Kafka** and **R2DBC**
- When **not** to use reactive programming (and what virtual threads offer instead)
- Debugging reactive pipelines (`log`, `checkpoint`, `doOnNext`)

## Prerequisites

- Modules 00-07 completed
- Java 21+ syntax (records, `var`, pattern matching)
- Spring Boot conventions (beans, properties, SLF4J logging)
- Understanding of the Order Management System domain model

---

## 1. What Is Reactive Programming?

**Reactive programming** is a programming paradigm built around **asynchronous data
streams**. Instead of pulling data from a source and blocking until it arrives,
you declare a pipeline of operations that react to data as it flows through.

### Imperative vs Reactive — An Analogy

| Imperative (Blocking) | Reactive (Non-Blocking) |
|-----------------------|------------------------|
| A **waiter** who takes one order, waits in the kitchen, delivers it, then takes the next order. The whole restaurant stalls while the kitchen cooks. | A **ticket system** where orders are placed on a conveyor belt. Multiple workers pick up tickets as they become ready, processing them in parallel without waiting. |
| `Thread.sleep(1000)` — the thread is blocked, doing nothing | `Flux.interval(Duration.ofSeconds(1))` — the thread is free to do other work between emissions |
| You **ask** for data and **wait** | You **subscribe** to data and get **notified** |

### A Concrete Example

**Imperative (blocking):**
```java
// Blocks the calling thread for 3 seconds total
List<Order> orders = orderRepository.findAll();  // blocks on DB I/O
List<OrderDto> dtos = orders.stream()
        .map(this::toDto)                         // blocks on CPU
        .toList();
return dtos;  // caller was waiting the entire time
```

**Reactive (non-blocking):**
```java
// Returns immediately; the caller subscribes and gets notified
Flux<OrderDto> dtos = orderRepository.findAll()     // returns Flux, no blocking
        .map(this::toDto)                            // transforms each item as it arrives
        .doOnNext(dto -> log.info("Processed {}", dto.id()));
// Nothing has executed yet! The caller must .subscribe()
return dtos;
```

The key insight: **nothing happens until someone subscribes**. The reactive
pipeline is a *declaration* of what should happen, not an immediate execution.

---

## 2. Why Reactive? The C10K Problem

The **C10K problem** refers to the challenge of handling 10,000+ concurrent
connections on a single server. In the traditional thread-per-request model:

- Each connection needs a dedicated OS thread
- Each thread consumes ~1MB of stack memory
- 10,000 threads = ~10GB of memory just for thread stacks
- Context switching between 10,000 threads wastes CPU cycles
- Most threads are **blocked on I/O** (waiting for database, HTTP, etc.) — doing nothing

### How Reactive Solves This

Reactive frameworks use a **small pool of threads** (typically 2x CPU cores)
and **non-blocking I/O**. When a thread initiates an I/O operation, it doesn't
wait — it moves on to the next task. When the I/O completes, a callback fires
on one of the available threads.

| Thread-Per-Request (Blocking) | Reactive (Non-Blocking) |
|-------------------------------|------------------------|
| 10,000 connections = 10,000 threads | 10,000 connections = ~8 threads |
| ~10GB memory for thread stacks | ~8MB memory for thread stacks |
| Threads blocked on I/O waste CPU | Threads always doing useful work |
| Scaling requires more hardware | Scaling requires better I/O utilization |

### When Java 21 Virtual Threads Help

Java 21's **virtual threads** (Project Loom) offer an alternative: lightweight
threads that can be blocked without wasting OS resources. Virtual threads make
*blocking code scale* — but they don't give you the pipeline composition,
backpressure, and stream operators that Reactor provides. Virtual threads and
Reactor are complementary, not exclusive.

---

## 3. The Reactive Streams Specification

Before diving into any specific library, it's important to understand the **Reactive Streams specification** — a standard that defines how asynchronous stream processing should work, regardless of the implementation (Reactor, RxJava, akka-streams, etc.).

### The Four Interfaces

The Reactive Streams spec defines four core interfaces:

```java
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

### The Lifecycle Contract

Here's the sequence of calls when a `Subscriber` subscribes to a `Publisher`:

```
Publisher          Subscriber
   |---subscribe()-->|
   |                  |---onSubscribe(Subscription)-->
   |                  |---request(n)-->
   |---onNext(item)-->|  (repeated, up to n items)
   |                  |---request(n)-->  (request more)
   |---onNext(item)-->|  (repeated)
   |---onComplete()-->|  OR  |---onError(throwable)-->
```

Key rules from the spec:

1. **`onSubscribe` is called exactly once** before any other signal.
2. **`onNext` is never called after `onComplete` or `onError`.**
3. **A `Subscription` must be cancelled** if the `Subscriber` no longer wants items.
4. **Calls are non-interfering** — `onNext` on subscriber A doesn't block subscriber B.
5. **`request(n)` controls demand** — the Publisher should not send more items than requested.

### Backpressure

**Backpressure** is the mechanism by which a `Subscriber` tells a `Publisher`: *"I can only handle N items at a time — don't send more than that."* This prevents a fast producer from overwhelming a slow consumer.

Without backpressure:

```
Fast Producer: [item1] [item2] [item3] [item4] [item5] → Slow Consumer
                                                        💥 buffer overflow
```

With backpressure:

```
Fast Producer: [item1] [item2] → Slow Consumer (request(2))
               (waits...)
                              ← request(2)
              [item3] [item4] → Slow Consumer
               (waits...)
```

This is a **push-pull** model: the Publisher pushes, but the Subscriber pulls by requesting a specific quantity. Different libraries handle backpressure differently:

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| **Buffer** | Store excess items in a queue | When items can be slightly delayed |
| **Drop** | Discard items the Subscriber can't process | Real-time metrics where missing data is OK |
| **Latest** | Keep only the most recent item | Live price feeds, sensor data |
| **Error** | Signal an error when overwhelmed | When data loss is unacceptable |
| **Block** | Block the producer thread | Legacy integration (anti-pattern in reactive) |

### Deep Dive: Backpressure in the Reactive Streams Spec

The Reactive Streams specification (formally, the [RS spec](https://www.reactive-streams.org/)) mandates that `Subscription.request(n)` is the ONLY way a Subscriber signals readiness. A Publisher MUST NOT send more items than the total requested amount minus the already delivered amount.

This means the contract enforces backpressure at the specification level — any compliant library (Reactor, RxJava, etc.) inherits this guarantee. The implementation details (buffering, dropping) are library-specific, but the demand-driven contract is universal.

A common mistake: calling `request(Long.MAX_VALUE)` effectively disables backpressure, turning the stream into an unbounded push model. This is fine for testing but dangerous in production — it defeats the purpose of reactive streams.

### Implementations of the Spec

The Reactive Streams spec is language-agnostic. Popular implementations include:

| Implementation | Language | Used For |
|---------------|----------|----------|
| **Project Reactor** | Java (JVM) | Spring WebFlux, Spring Data R2DBC |
| **RxJava** | Java (JVM) | Android, general JVM apps |
| **Mutiny** | Java (JVM) | Quarkus |
| **akka-streams** | Scala (JVM) | Akka ecosystem |
| **flow** | Kotlin | Coroutines + Flow (Kotlin's native reactive) |

All implement the same interfaces. The concepts you learn here transfer to any of them.

---

## 4. Project Reactor — An Implementation

**Project Reactor** is the Reactive Streams implementation used by Spring WebFlux. It provides two primary types:

- **`Mono<T>`** — emits **zero or one** item, then completes (or errors)
- **`Flux<T>`** — emits **zero to N** items, then completes (or errors)

Both implement the **`Publisher`** interface from the Reactive Streams spec.

### Mono vs Flux — When to Use Each

| Type | Analogy | Use Case |
|------|---------|----------|
| `Mono` | A single ticket booth — you get one ticket or none | Find by ID, save one record, HTTP request returning one response |
| `Flux` | A train line — trains keep arriving, possibly forever | List all records, Kafka topic stream, WebSocket messages |

---

## 5. Creating Mono and Flux

### Static Factory Methods

| Factory | Description | Example |
|---------|-------------|---------|
| `Mono.just(T)` | Emits one item and completes | `Mono.just("Hello")` |
| `Mono.empty()` | Emits nothing, completes immediately | `Mono.empty()` |
| `Mono.error(Throwable)` | Emits nothing, signals an error | `Mono.error(new RuntimeException("fail"))` |
| `Mono.fromCallable(Callable)` | Wraps a blocking call, emits its result | `Mono.fromCallable(() -> repo.findById(id))` |
| `Mono.fromSupplier(Supplier)` | Wraps a lazy value computation | `Mono.fromSupplier(() -> generateId())` |
| `Flux.just(T...)` | Emits each argument and completes | `Flux.just(1, 2, 3)` |
| `Flux.fromIterable(Iterable)` | Emits each element of a collection | `Flux.fromIterable(orders)` |
| `Flux.range(int, int)` | Emits a range of integers | `Flux.range(1, 10)` |
| `Flux.empty()` | Emits nothing, completes | `Flux.empty()` |
| `Flux.error(Throwable)` | Emits nothing, signals an error | `Flux.error(new IllegalStateException())` |
| `Flux.interval(Duration)` | Emits 0L, 1L, 2L... at fixed intervals | `Flux.interval(Duration.ofSeconds(1))` |

### Code Example — Creating Publishers

```java
package com.example.ordermgmt.reactive;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

public class PublisherDemo {

    // Mono: zero or one item
    public Mono<String> singleGreeting() {
        return Mono.just("Hello, Reactive World!");
    }

    // Mono: from a blocking call (wraps synchronous code)
    public Mono<Integer> computeAsync() {
        return Mono.fromCallable(() -> {
            Thread.sleep(100);  // simulate work
            return 42;
        });
    }

    // Flux: emit multiple items
    public Flux<Integer> numbers() {
        return Flux.range(1, 10);
    }

    // Flux: from a collection
    public Flux<String> fromList() {
        return Flux.fromIterable(List.of("apple", "banana", "cherry"));
    }

    // Flux: emit at intervals
    public Flux<Long> ticker() {
        return Flux.interval(Duration.ofSeconds(1))
                .take(5);  // stop after 5 emissions
    }

    // Mono: empty (no result)
    public Mono<Void> logEvent(String event) {
        return Mono.fromRunnable(() -> System.out.println("Event: " + event))
                .then();  // converts to Mono<Void>
    }
}
```

---

## 6. Core Operators

Operators transform, filter, or combine reactive streams. Each operator returns
a new `Mono` or `Flux` — they **never mutate** the source.

### Reference Table

| Operator | Purpose | Input | Output |
|----------|---------|-------|--------|
| `map` | Transforms each item | `Flux<Integer>` | `Flux<String>` |
| `flatMap` | Transforms each item into a new Publisher, flattens | `Flux<Order>` | `Flux<OrderDto>` |
| `filter` | Keeps items matching a predicate | `Flux<Integer>` | `Flux<Integer>` |
| `collectList` | Collects all items into a `List` | `Flux<Order>` | `Mono<List<Order>>` |
| `reduce` | Reduces to a single value | `Flux<Integer>` | `Mono<Integer>` |
| `concat` | Joins streams sequentially | `Flux<A>, Flux<A>` | `Flux<A>` |
| `merge` | Interleaves streams in real-time | `Flux<A>, Flux<A>` | `Flux<A>` |
| `zip` | Combines items pairwise from two streams | `Flux<A>, Flux<B>` | `Flux<Tuple2<A,B>>` |
| `flatMapMany` | Mono → Flux (one-to-many) | `Mono<Order>` | `Flux<OrderItem>` |
| `switchIfEmpty` | Fallback when stream is empty | `Mono<Order>` | `Mono<Order>` |
| `doOnNext` | Side effect per item (logging, metrics) | `Flux<Order>` | `Flux<Order>` |
| `take` | Limits number of items | `Flux<Integer>` | `Flux<Integer>` |
| `delayElements` | Delays each emission | `Flux<Order>` | `Flux<Order>` |

### Code Example — Building an Order-Status Pipeline

```java
package com.example.ordermgmt.reactive;

import com.example.ordermgmt.domain.OrderStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

public class OrderStatusPipeline {

    private static final Logger log = LoggerFactory.getLogger(OrderStatusPipeline.class);

    public record OrderStatusUpdate(
            Long orderId,
            OrderStatus status,
            BigDecimal totalAmount,
            Instant timestamp
    ) {}

    // Simulate order status changes over time
    public Flux<OrderStatusUpdate> streamOrderUpdates() {
        return Flux.just(
                        new OrderStatusUpdate(1L, OrderStatus.PENDING, new BigDecimal("99.99"), Instant.now()),
                        new OrderStatusUpdate(1L, OrderStatus.CONFIRMED, new BigDecimal("99.99"), Instant.now()),
                        new OrderStatusUpdate(2L, OrderStatus.PENDING, new BigDecimal("45.50"), Instant.now()),
                        new OrderStatusUpdate(1L, OrderStatus.SHIPPED, new BigDecimal("99.99"), Instant.now()),
                        new OrderStatusUpdate(2L, OrderStatus.CONFIRMED, new BigDecimal("45.50"), Instant.now())
                )
                .delayElements(Duration.ofMillis(500))
                .doOnNext(update -> log.info("Order {} -> {}", update.orderId(), update.status()))
                .onBackpressureLatest();
    }

    // Filter and transform
    public Flux<String> getPendingOrderSummaries() {
        return streamOrderUpdates()
                .filter(u -> u.status() == OrderStatus.PENDING)
                .map(u -> "Order #" + u.orderId() + " pending, total: $" + u.totalAmount());
    }

    // Aggregate: collect all updates for order 1
    public Mono<List<OrderStatusUpdate>> getUpdatesForOrder(Long orderId) {
        return streamOrderUpdates()
                .filter(u -> u.orderId().equals(orderId))
                .collectList();
    }

    // Reduce: count total updates
    public Mono<Long> countTotalUpdates() {
        return streamOrderUpdates()
                .count();
    }

    // Combine two streams with zip
    public Flux<String> zipOrderIdsWithStatuses() {
        Flux<Long> orderIds = Flux.just(1L, 2L, 3L);
        Flux<OrderStatus> statuses = Flux.just(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED);

        return Flux.zip(orderIds, statuses, (id, status) ->
                "Order " + id + " is " + status);
    }
}
```

---

## 7. The Reactive Stream Contract

Every `Mono` and `Flux` obeys a contract with three lifecycle signals:

1. **`onNext(T)`** — emitted for each element (Flux only; Mono calls it at most once)
2. **`onError(Throwable)`** — emitted once if the stream fails
3. **`onComplete()`** — emitted once when the stream finishes successfully

```java
Flux<String> stream = Flux.just("Hello", "Reactive", "World")
        .doOnNext(s -> log.info("onNext: {}", s))
        .doOnError(e -> log.error("onError: {}", e.getMessage()))
        .doOnComplete(() -> log.info("onComplete"));
```

The contract is **guaranteed**: operators cannot swallow `onError` unless you
explicitly handle it with `onErrorReturn`, `onErrorResume`, or `retry`.

---

## 8. Backpressure — Protecting Slow Consumers

### What Is Backpressure?

When a fast producer sends data faster than a slow consumer can process it,
the unprocessed items pile up in memory. **Backpressure** is the mechanism that
tells the producer to slow down.

### Reactor's Backpressure Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `onBackpressureBuffer()` | Buffers all items in an unbounded queue | When no items should be lost and memory is available |
| `onBackpressureBuffer(int)` | Bounded buffer; emits error on overflow | When you want to know about overflow |
| `onBackpressureDrop()` | Drops items that can't be processed | When old data is irrelevant (e.g., heartbeats) |
| `onBackpressureLatest()` | Keeps only the newest item | When only the latest value matters (e.g., status updates) |

```java
// Fast producer, slow consumer
Flux<Integer> fastProducer = Flux.range(1, 10000)
        .delayElements(Duration.ofMillis(1));  // produce every 1ms

Flux<Integer> safe = fastProducer
        .onBackpressureBuffer(100)  // buffer up to 100 items
        .doOnNext(n -> {
            try {
                Thread.sleep(50);  // simulate slow processing
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
```

---

## 9. Threading and Schedulers

Reactor separates **where work happens** using schedulers:

| Scheduler | Purpose |
|-----------|---------|
| `Schedulers.immediate()` | Current thread (default) |
| `Schedulers.single()` | A single reusable thread |
| `Schedulers.parallel()` | CPU-intensive work (N threads, N = CPU cores) |
| `Schedulers.boundedElastic()` | Blocking I/O work (bounded thread pool) |

### `publishOn` vs `subscribeOn`

- **`publishOn(Scheduler)`** — affects **downstream** operators (after this call)
- **`subscribeOn(Scheduler)`** — affects the **source** (where subscription happens)

```java
Flux<String> pipeline = Flux.fromIterable(List.of("a", "b", "c"))
        // source runs on boundedElastic (good for blocking I/O)
        .subscribeOn(Schedulers.boundedElastic())
        .map(String::toUpperCase)
        // downstream operators run on parallel (CPU work)
        .publishOn(Schedulers.parallel())
        .doOnNext(s -> log.info("Processing '{}' on thread {}", s, Thread.currentThread().getName()))
        .filter(s -> s.length() > 0);
```

---

## 10. Error Handling

| Method | Effect |
|--------|--------|
| `onErrorReturn(T)` | Replace error with a fallback value |
| `onErrorResume(Function)` | Replace error with a fallback Publisher |
| `retry(long)` | Retry the entire stream N times |
| `retryWhen(Retry)` | Custom retry logic (exponential backoff) |
| `doOnError(Consumer)` | Side effect on error (logging) |
| `onErrorMap(Function)` | Transform the error into a different exception |

```java
// Retry with exponential backoff
Mono<String> resilientCall = webClient.get()
        .uri("/api/external")
        .retrieve()
        .bodyToMono(String.class)
        .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
        .onErrorResume(e -> {
            log.error("All retries failed", e);
            return Mono.just("fallback");
        });
```

---

## 11. Hot vs. Cold Publishers

| Type | Behavior | Analogy |
|------|----------|---------|
| **Cold** | Starts for each subscriber; runs from the beginning | A movie — each viewer watches from the start |
| **Hot** | Runs regardless of subscribers; late subscribers miss earlier items | A live concert — late arrivals miss the opening |

### Converting Cold to Hot

```java
// Cold: each subscriber gets all 3 items
Flux<Integer> cold = Flux.range(1, 3);

// Hot: late subscribers only get items emitted after they subscribe
Flux<Integer> hot = cold.share();

// Hot with replay: late subscribers get last N items
Flux<Integer> hotWithReplay = cold.replay(2).refCount();
```

### Sinks — Programmatic Emission

Reactor provides **`Sinks`** (replacing the deprecated `Processor`) for
manually pushing items into a stream:

```java
import reactor.core.publisher.Sinks;

public class OrderStatusPublisher {
    // multicast: multiple subscribers see the same items
    private final Sinks.Many<OrderStatusUpdate> sink =
            Sinks.many().multicast().onBackpressureBuffer();

    public void publish(OrderStatusUpdate update) {
        sink.tryEmitNext(update);
    }

    public Flux<OrderStatusUpdate> subscribe() {
        return sink.asFlux();
    }
}
```

---

## 12. Spring WebFlux — Reactive Controllers

Spring WebFlux is the reactive alternative to Spring MVC. It uses Netty (non-blocking
I/O) instead of Tomcat (thread-per-request).

### Annotated Controller (familiar style)

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/reactive/orders")
public class ReactiveOrderController {

    private static final Logger log = LoggerFactory.getLogger(ReactiveOrderController.class);
    private final OrderService orderService;

    public ReactiveOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Returns a Flux: all orders stream asynchronously
    @GetMapping
    public Flux<OrderResponse> findAll() {
        return orderService.findAllReactive();
    }

    // Returns a Mono: single order or empty
    @GetMapping("/{id}")
    public Mono<OrderResponse> findById(@PathVariable Long id) {
        return orderService.findByIdReactive(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Order not found: " + id)));
    }

    // Returns a Flux: stream of status updates via SSE
    @GetMapping(value = "/{id}/status/stream", produces = "text/event-stream")
    public Flux<OrderStatus> streamStatusUpdates(@PathVariable Long id) {
        return orderService.streamStatusUpdates(id);
    }
}
```

### Functional Routing (DSL style)

```java
package com.example.ordermgmt.config;

import com.example.ordermgmt.controller.ReactiveOrderController;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;

import static org.springframework.web.reactive.function.server.RequestPredicates.*;
import static org.springframework.web.reactive.function.server.RouterFunctions.*;

@Configuration
public class ReactiveRouter {

    @Bean
    public RouterFunction<ServerResponse> orderRoutes(ReactiveOrderController controller) {
        return route(GET("/api/reactive/orders"), controller::findAll)
                .andRoute(GET("/api/reactive/orders/{id}"), controller::findById)
                .andRoute(GET("/api/reactive/orders/{id}/status/stream"), controller::streamStatusUpdates);
    }
}
```

---

## 13. Integrating Reactive Kafka

### Reactive Producer

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.reactive.ReactiveKafkaProducerTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
public class ReactiveOrderProducer {

    private static final Logger log = LoggerFactory.getLogger(ReactiveOrderProducer.class);

    private final ReactiveKafkaProducerTemplate<String, OrderCreatedEvent> template;
    private final String topic;

    public ReactiveOrderProducer(
            ReactiveKafkaProducerTemplate<String, OrderCreatedEvent> template,
            @Value("${kafka.topic.order-created:order-created}") String topic) {
        this.template = template;
        this.topic = topic;
    }

    public Mono<Void> publish(OrderCreatedEvent event) {
        return template.send(topic, event.orderId().toString(), event)
                .doOnSuccess(result -> log.info("Published event for order {} to partition {}",
                        event.orderId(), result.recordMetadata().partition()))
                .doOnError(e -> log.error("Failed to publish event for order {}", event.orderId(), e))
                .then();
    }
}
```

### Reactive Consumer

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.reactive.ReactiveKafkaConsumerTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import jakarta.annotation.PostConstruct;

@Component
public class ReactiveOrderConsumer {

    private static final Logger log = LoggerFactory.getLogger(ReactiveOrderConsumer.class);

    private final ReactiveKafkaConsumerTemplate<String, OrderCreatedEvent> template;

    public ReactiveOrderConsumer(ReactiveKafkaConsumerTemplate<String, OrderCreatedEvent> template) {
        this.template = template;
    }

    @PostConstruct
    public void startListening() {
        template.receiveAutoAck()
                .flatMap(records -> Flux.fromIterable(records)
                        .doOnNext(record -> log.info("Consumed: orderId={}, partition={}",
                                record.value().orderId(), record.partition())))
                .subscribe();
    }
}
```

---

## 14. Integrating Reactive Database (R2DBC)

Spring Data R2DBC provides a reactive alternative to JPA. Instead of
`JpaRepository`, you use `ReactiveCrudRepository`:

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface ReactiveOrderRepository extends R2dbcRepository<OrderEntity, Long> {
    Flux<OrderEntity> findByStatus(OrderStatus status);
}
```

---

## 15. Putting It All Together — Reactive Order Service

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.*;
import com.example.ordermgmt.dto.*;
import com.example.ordermgmt.kafka.ReactiveOrderProducer;
import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.repository.ReactiveOrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.math.BigDecimal;

@Service
public class ReactiveOrderService {

    private static final Logger log = LoggerFactory.getLogger(ReactiveOrderService.class);

    private final ReactiveOrderRepository orderRepository;
    private final ReactiveOrderProducer producer;
    private final Sinks.Many<OrderStatus> statusSink =
            Sinks.many().multicast().onBackpressureBuffer();

    public ReactiveOrderService(ReactiveOrderRepository orderRepository,
                                  ReactiveOrderProducer producer) {
        this.orderRepository = orderRepository;
        this.producer = producer;
    }

    public Flux<OrderResponse> findAllReactive() {
        return orderRepository.findAll()
                .map(OrderResponse::from);
    }

    public Mono<OrderResponse> findByIdReactive(Long id) {
        return orderRepository.findById(id)
                .map(OrderResponse::from);
    }

    public Mono<OrderResponse> createOrder(CreateOrderRequest request) {
        OrderEntity order = new OrderEntity();
        // ... build order from request (see Module 05 for logic)
        return orderRepository.save(order)
                .flatMap(saved -> {
                    OrderCreatedEvent event = OrderCreatedEvent.from(saved);
                    statusSink.tryEmitNext(saved.getStatus());
                    return producer.publish(event).thenReturn(OrderResponse.from(saved));
                });
    }

    public Mono<OrderResponse> updateStatus(Long orderId, OrderStatus newStatus) {
        return orderRepository.findById(orderId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Order not found: " + orderId)))
                .flatMap(order -> {
                    order.setStatus(newStatus);
                    return orderRepository.save(order);
                })
                .doOnNext(order -> statusSink.tryEmitNext(order.getStatus()))
                .map(OrderResponse::from);
    }

    // Stream status updates to subscribers (SSE, WebSocket)
    public Flux<OrderStatus> streamStatusUpdates(Long orderId) {
        return statusSink.asFlux()
                .filter(status -> true);  // in real code, filter by orderId
    }
}
```

---

## 16. Debugging Reactive Pipelines

Reactive pipelines can be hard to debug because the stack traces don't reflect
the pipeline structure. Reactor provides debugging tools:

| Tool | Description |
|------|-------------|
| `.log()` | Logs every signal (onNext, onError, onComplete) |
| `.checkpoint("name")` | Adds the calling site to the stack trace on error |
| `.doOnNext(...)` | Side-effect peeking at each item |
| `.doOnSubscribe(...)` | Side-effect when subscription happens |
| `Hooks.onOperatorDebug()` | Global debug mode (adds assembly traces — slow, use in dev only) |

```java
Flux<Integer> debugged = Flux.range(1, 10)
        .log("source")                                    // log all signals
        .filter(n -> n % 2 == 0)
        .checkpoint("after-filter")                       // trace on error
        .map(n -> n * 10)
        .doOnNext(n -> log.info("Mapped: {}", n));
```

---

## 17. When NOT to Use Reactive Programming

| Situation | Why Reactive Is Inappropriate |
|-----------|------------------------------|
| CPU-bound computation (crypto, algorithms) | Reactive adds thread-pool overhead; tight loops are faster |
| Simple batch jobs with no I/O | Operator boilerplate outweighs benefits |
| Team unfamiliar with reactive paradigm | Debugging and reasoning about async pipelines has a steep learning curve |
| Most blocking JDBC libraries | Wrapping blocking code in `boundedElastic` works but negates the scalability benefit |
| Existing JPA/Hibernate codebase | JPA is inherently blocking; mixing reactive and blocking is confusing |

**Rule of thumb:** Use reactive when your application is **I/O-bound** and needs
to handle **many concurrent connections**. Otherwise, traditional Spring MVC
(or Spring MVC + virtual threads) is simpler and sufficient.

---

## What You Learned

- **Reactive programming** models computation as asynchronous data streams, not blocking calls
- **Mono** emits 0-or-1 items; **Flux** emits 0-to-N items
- **Nothing executes until someone subscribes** — the pipeline is a declaration
- **Operators** (`map`, `flatMap`, `filter`, `zip`, `merge`) transform streams without mutating sources
- **Backpressure** protects slow consumers from fast producers
- **Schedulers** control where work runs: `boundedElastic` for blocking I/O, `parallel` for CPU
- **Error handling**: `onErrorReturn`, `onErrorResume`, `retryWhen` with exponential backoff
- **Hot publishers** (via `Sinks`) allow real-time push to multiple subscribers
- **Spring WebFlux** provides reactive controllers and functional routing
- **R2DBC** offers reactive database access as an alternative to blocking JPA
- Use reactive when I/O-bound and high-concurrency; use imperative otherwise

---

## 18. Combining Multiple Reactive Streams

Reactors provides several operators for combining streams. Each has different
semantics for when and how items are emitted.

### merge — Interleave Items in Real-Time

```java
Flux<String> fastProducer = Flux.interval(Duration.ofMillis(100))
        .map(i -> "Fast: " + i);
Flux<String> slowProducer = Flux.interval(Duration.ofMillis(300))
        .map(i -> "Slow: " + i);

// merge: items from both streams interleaved as they arrive
Flux<String> merged = Flux.merge(fastProducer, slowProducer)
        .take(10);
```

### concat — One After Another

```java
// concat: completes the first stream, then subscribes to the second
Flux<String> batch1 = Flux.fromIterable(List.of("a", "b", "c"));
Flux<String> batch2 = Flux.fromIterable(List.of("d", "e", "f"));

Flux<String> allInOrder = Flux.concat(batch1, batch2);
// Output: a, b, c, d, e, f (sequential)
```

### zip — Pairwise Combination

```java
Flux<Long> orderIds = Flux.just(1L, 2L, 3L);
Flux<OrderStatus> statuses = Flux.just(
        OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED);

// zip: pairs items by position — waits for both streams to emit item N
Flux<String> pairs = Flux.zip(orderIds, statuses, (id, status) ->
        "Order " + id + " -> " + status);
// Output: "Order 1 -> PENDING", "Order 2 -> CONFIRMED", etc.
```

### combineLatest — React to Any Change

```java
Flux<OrderStatus> status1 = orderService.streamUpdates(1L);
Flux<OrderStatus> status2 = orderService.streamUpdates(2L);

// combineLatest: emits whenever EITHER source emits
Flux<String> combined = Flux.combineLatest(status1, status2, (s1, s2) ->
        "Order 1: " + s1 + " | Order 2: " + s2);
// Emits whenever either status changes
```

### switchOnNext — Cancel Previous, Subscribe to New

```java
// Each time the outer Flux emits a new inner Flux, cancel the old one
Flux<Flux<OrderEvent>> perCustomerStreams = customerIds
        .map(id -> orderService.streamForCustomer(id));

Flux<OrderEvent> latestCustomerStream = Flux.switchOnNext(perCustomerStreams);
// Only events from the LAST customer's stream are processed
```

### When to Use Each

| Operator | Behavior | Use Case |
|----------|----------|----------|
| `merge` | Interleaves all items in real-time | Combining multiple event sources |
| `concat` | Sequential — first stream completes, then second | Batching ordered operations |
| `zip` | Pairs items by index | Joining two streams with matching cardinality |
| `combineLatest` | Emits on any source change | Dashboards showing latest state of multiple sources |
| `switchOnNext` | Cancels previous, subscribes to new | Search-as-you-type, real-time switching |

---

## 19. Reactive Testing with StepVerifier

StepVerifier is the standard tool for testing reactive pipelines.

### Basic Verification

```java
import reactor.test.StepVerifier;

@Test
void flux_emits_expected_items() {
    Flux<String> flux = Flux.just("A", "B", "C");

    StepVerifier.create(flux)
            .expectNext("A")
            .expectNext("B")
            .expectNext("C")
            .verifyComplete();
}

@Test
void mono_empty_when_not_found() {
    Mono<Order> notFound = orderRepo.findById(9999L);

    StepVerifier.create(notFound)
            .verifyComplete();  // expect empty completion, no items
}

@Test
void mono_errors_on_invalid_id() {
    Mono<Order> error = Mono.error(new IllegalArgumentException("Invalid ID"));

    StepVerifier.create(error)
            .expectError(IllegalArgumentException.class)
            .verify();
}
```

### Testing Time-Based Operators with VirtualTime

```java
@Test
void interval_emits_at_intervals() {
    StepVerifier.withVirtualTime(() ->
            Flux.interval(Duration.ofSeconds(1)).take(3))
            .expectNext(0L)
            .thenAwait(Duration.ofSeconds(1))
            .expectNext(1L)
            .thenAwait(Duration.ofSeconds(1))
            .expectNext(2L)
            .verifyComplete();
}
```

Virtual time replaces the real clock — 1 second passes instantly but the
sequence of emissions is verifiable.

### Testing Backpressure

```java
@Test
void backpressure_buffer_keeps_items() {
    Flux<Integer> flux = Flux.range(1, 100)
            .onBackpressureBuffer(50);

    StepVerifier.create(flux, 0)  // request 0 items initially
            .thenRequest(10)
            .expectNextCount(10)
            .thenRequest(90)
            .expectNextCount(90)
            .verifyComplete();
}
```

### Asserting State

```java
@Test
void map_transforms_each_item() {
    Flux<Integer> squared = Flux.range(1, 3).map(n -> n * n);

    StepVerifier.create(squared)
            .expectNextMatches(n -> n == 1)  // 1*1
            .expectNextMatches(n -> n == 4)  // 2*2
            .expectNextMatches(n -> n == 9)  // 3*3
            .verifyComplete();
}
```

---

## 20. Reactive Design Patterns

### The "FlatMap Chain" Pattern

When working with Mono/Flux, you often chain operations that each return a
new reactive type. Use `flatMap` to chain them:

```java
public Mono<OrderResponse> createOrder(CreateOrderRequest request) {
    return customerRepo.findById(request.customerId())
            .switchIfEmpty(Mono.error(new IllegalArgumentException("Customer not found")))
            .flatMap(customer -> {
                OrderEntity order = new OrderEntity();
                order.setCustomer(customer);
                return Mono.just(order);
            })
            .flatMap(order -> {
                // Add items
                return Flux.fromIterable(request.items())
                        .flatMap(itemRequest -> 
                            productRepo.findById(itemRequest.productId())
                                .map(product -> createOrderItem(order, product, itemRequest)))
                        .collectList()
                        .map(items -> {
                            order.setItems(items);
                            order.recalculateTotal();
                            return order;
                        });
            })
            .flatMap(orderRepo::save)
            .doOnNext(order -> log.info("Order created: {}", order.getId()))
            .map(OrderResponse::from)
            .onErrorResume(e -> {
                log.error("Failed to create order", e);
                return Mono.error(e);
            });
}
```

### The "Reactive Repository Wrapper" Pattern

When you have a blocking repository but need reactive return types:

```java
@Service
public class ReactiveOrderService {

    private final OrderRepository blockingRepo;

    public ReactiveOrderService(OrderRepository blockingRepo) {
        this.blockingRepo = blockingRepo;
    }

    // Wrap blocking calls in Mono.fromCallable on boundedElastic
    public Mono<OrderEntity> findByIdReactive(Long id) {
        return Mono.fromCallable(() -> blockingRepo.findById(id).orElse(null))
                .subscribeOn(Schedulers.boundedElastic());
    }

    public Flux<OrderEntity> findAllReactive() {
        return Mono.fromCallable(() -> blockingRepo.findAll())
                .subscribeOn(Schedulers.boundedElastic())
                .flatMapMany(Flux::fromIterable);
    }

    public Mono<OrderEntity> saveReactive(OrderEntity order) {
        return Mono.fromCallable(() -> blockingRepo.save(order))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
```

**Warning:** This pattern wraps blocking code — it doesn't make the code
truly non-blocking. It just moves the blocking to a separate thread pool.
For true non-blocking I/O, use R2DBC instead of JPA.

### The "Sinks.Broadcast" Pattern

For real-time push to multiple subscribers:

```java
@Component
public class OrderStatusBroadcaster {

    private final Sinks.Many<OrderStatusUpdate> broadcast =
            Sinks.many().multicast().onBackpressureBuffer(256);

    // Called by the service when status changes
    public void broadcast(OrderStatusUpdate update) {
        broadcast.tryEmitNext(update);
    }

    // Called by SSE/WebSocket endpoints
    public Flux<OrderStatusUpdate> subscribe() {
        return broadcast.asFlux()
                .doOnCancel(() -> log.info("Subscriber disconnected"));
    }
}

@RestController
public class StatusController {

    private final OrderStatusBroadcaster broadcaster;

    @GetMapping(value = "/orders/status/stream", produces = "text/event-stream")
    public Flux<OrderStatusUpdate> streamStatus() {
        return broadcaster.subscribe();
    }
}
```

---

## 21. Common Reactor Pitfalls

### Pitfall 1: Forgetting to Subscribe

```java
// BAD: Nothing happens — no subscription
mono.doOnNext(x -> log.info("Got: {}", x));

// GOOD: Subscribe or return from a controller
mono.doOnNext(x -> log.info("Got: {}", x)).subscribe();

// In a WebFlux controller — framework subscribes for you
@GetMapping("/orders/{id}")
public Mono<OrderResponse> findById(@PathVariable Long id) {
    return orderService.findByIdReactive(id);  // framework subscribes
}
```

### Pitfall 2: Blocking in a Reactive Pipeline

```java
// BAD: blocks the event loop thread!
public Mono<Order> findByIdBad(Long id) {
    return Mono.just(orderRepo.findById(id).get());  // .get() blocks!
}

// GOOD: wrap blocking call in boundedElastic
public Mono<Order> findByIdGood(Long id) {
    return Mono.fromCallable(() -> orderRepo.findById(id).orElseThrow())
            .subscribeOn(Schedulers.boundedElastic());
}
```

### Pitfall 3: Using flatMap When You Mean map

```java
// BAD: flatMap expects a Publisher, not a value
flux.flatMap(item -> transform(item))   // transform returns T, not Mono<T>

// GOOD: use map for synchronous transformations
flux.map(item -> transform(item))       // transform returns T

// GOOD: use flatMap when the transformation returns a Mono/Flux
flux.flatMap(item -> repo.save(item))   // repo.save returns Mono<T>
```

### Pitfall 4: Swallowing Errors

```java
// BAD: error is silently swallowed
flux.onErrorResume(e -> Mono.empty());

// GOOD: log and propagate, or provide a fallback
flux.onErrorResume(e -> {
    log.error("Failed", e);
    return Mono.error(new OrderProcessingException("Failed to process", e));
});
```

### Pitfall 5: Creating Hot Publishers Accidentally

```java
// BAD: share() makes it hot — late subscribers miss early items
Flux<Order> hot = orderRepo.findAll().share();

// GOOD for cold data: just return the Flux
Flux<Order> cold = orderRepo.findAll();  // each subscriber gets all items
```

---