---
title: "Spring WebFlux, Virtual Threads vs Reactive & Module Review"
description: "Spring WebFlux, Virtual Threads vs Reactive & Module Review"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/08-reactor-pattern/0049-webflux-virtual-threads.md
---

Reactive pipelines live inside a web framework, connected to a database and a message broker. This lesson shows you how Spring WebFlux wires Mono and Flux into HTTP endpoints, how reactive Kafka and R2DBC complete the non-blocking stack, and when you should **skip reactive entirely**. Spring Boot 4 defaults to virtual threads for MVC, making it the right choice for most applications without any reactive code.

## Spring WebFlux: Reactive Controllers

Spring WebFlux replaces Spring MVC's thread-per-request model with a small pool of non-blocking event-loop threads (Netty by default). The controller looks almost identical. You just return `Mono` or `Flux` instead of plain objects.

```
@RestController
@RequestMapping("/api/reactive/orders")
public class ReactiveOrderController {

    private final OrderService orderService;

    public ReactiveOrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Flux: all orders stream asynchronously
    @GetMapping
    public Flux<OrderResponse> findAll() {
        return orderService.findAllReactive();
    }

    // Mono: single order or 404
    @GetMapping("/{id}")
    public Mono<OrderResponse> findById(@PathVariable Long id) {
        return orderService.findByIdReactive(id)
            .switchIfEmpty(Mono.error(
                new ResponseStatusException(HttpStatus.NOT_FOUND)));
    }

    // SSE: stream of status updates
    @GetMapping(value = "/{id}/status/stream",
                produces = "text/event-stream")
    public Flux<OrderStatus> streamStatusUpdates(@PathVariable Long id) {
        return orderService.streamStatusUpdates(id);
    }
}
```

Three things to notice:

-   **The framework subscribes for you.** You never call `.subscribe()` in a controller. WebFlux does it when the HTTP connection arrives.
-   **Flux + `text/event-stream` = Server-Sent Events.** The browser receives each `onNext` as an SSE event, no WebSocket needed.
-   **`switchIfEmpty` replaces empty with an error**, which Spring maps to a 404 response.

You can also use WebFlux's **functional routing** DSL instead of annotated controllers:

```
@Configuration
public class ReactiveRouter {

    @Bean
    public RouterFunction<ServerResponse> orderRoutes(
            ReactiveOrderController ctrl) {
        return route(GET("/api/reactive/orders"), ctrl::findAll)
            .andRoute(GET("/api/reactive/orders/{id}"), ctrl::findById);
    }
}
```

Both styles produce the same runtime behavior. The annotated style is more common; the functional style gives finer control over request matching.

## Connecting Reactive to Kafka

The `spring-kafka` reactive module provides `ReactiveKafkaProducerTemplate` and `ReactiveKafkaConsumerTemplate` that return `Mono` and `Flux`, with no blocking and no thread-handoff.

```
// Producer: returns Mono, not void
@Component
public class ReactiveOrderProducer {

    private final ReactiveKafkaProducerTemplate<String, OrderCreatedEvent> template;

    public Mono<Void> publish(OrderCreatedEvent event) {
        return template.send("order-created", event.orderId().toString(), event)
            .doOnSuccess(r -> log.info("Published to partition {}",
                r.recordMetadata().partition()))
            .then();
    }
}

// Consumer: returns Flux of records
@Component
public class ReactiveOrderConsumer {

    private final ReactiveKafkaConsumerTemplate<String, OrderCreatedEvent> template;

    @PostConstruct
    public void startListening() {
        template.receiveAutoAck()
            .flatMap(records -> Flux.fromIterable(records)
                .doOnNext(r -> log.info("Consumed: orderId={}",
                    r.value().orderId())))
            .subscribe();
    }
}
```

The consumer's `receiveAutoAck()` returns a `Flux` of batches. Each batch is auto-committed after downstream processing. Because everything is a `Flux`, you can compose backpressure, retry, and error-handling operators directly on the Kafka stream.

## Connecting Reactive to the Database: R2DBC

JPA and Hibernate are **inherently blocking**. Every `findById` blocks a thread waiting for the JDBC driver. Spring Data R2DBC provides a reactive alternative. Instead of `JpaRepository`, you extend `ReactiveCrudRepository`:

```
@Repository
public interface ReactiveOrderRepository
        extends R2dbcRepository<OrderEntity, Long> {
    Flux<OrderEntity> findByStatus(OrderStatus status);
}
```

The methods return `Mono` and `Flux` directly, with no wrapping and no `boundedElastic` workarounds. Under the hood, R2DBC uses a non-blocking database driver (PostgreSQL's `r2dbc-postgresql`, for example) that multiplexes queries over a single TCP connection.

**Important:** R2DBC is *not* JPA. There is no lazy loading, no first-level cache, no dirty checking. It is closer to `JdbcTemplate` with reactive types: simple, explicit, and non-blocking.

## The Full Reactive Stack

When every layer is non-blocking, the event-loop threads **never wait**:

```
HTTP request (Netty event loop)
  → Controller (returns Mono/Flux, no blocking)
    → Service (chains Mono operators, no blocking)
      → R2DBC (non-blocking DB driver)
        → Database
      → ReactiveKafka (non-blocking broker client)
        → Kafka
```

A single Netty thread can handle thousands of in-flight requests. It initiates I/O, moves on, and picks up the callback when the response arrives. That is the C10K solution in practice.

Mix one blocking layer into this stack (a JPA `findById`, a `Thread.sleep`, a blocking HTTP client) and you defeat the entire model. The event-loop thread stalls, every other request on that thread stalls, and throughput collapses.

## Virtual Threads: Blocking, But Cheap

Java 21 introduced **virtual threads** (Project Loom): lightweight threads managed by the JVM, not the OS. A virtual thread costs ~1KB instead of ~1MB. You can create millions of them.

```
// Spring Boot 4 + virtual threads (enabled by default)
@SpringBootApplication
public class OrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}

// No configuration needed. Boot 4 uses virtual threads
// for MVC request handling out of the box.
```

Spring Boot 4 enables virtual threads by default for Spring MVC. Every incoming request gets a virtual thread automatically. Your controller code looks **completely normal**, with blocking JPA, blocking Kafka, blocking everything, but the threads are so cheap that blocking is fine.

Virtual threads **are still blocking**. When `orderRepo.findById()` calls JDBC, the virtual thread *blocks*, but instead of pinning an OS thread, the JVM unmounts it and gives the carrier thread to another virtual thread. From the OS perspective, the carrier thread is always doing useful work. From your code's perspective, nothing changed. It's still imperative, synchronous Java.

## When to Use Which

| Factor | Spring MVC + Virtual Threads (default in Boot 4) | Spring WebFlux + Reactor |
| --- | --- | --- |
| Code style | Imperative, familiar | Declarative pipelines, steeper learning curve |
| Existing JPA/Hibernate codebase | Works directly | Requires R2DBC rewrite or `boundedElastic` wrapping |
| Streaming / SSE / backpressure | Limited | First-class Flux support |
| Pipeline composition | Manual orchestration | Rich operator library (`map`, `flatMap`, `zip`, `retryWhen`) |
| Debugging | Normal stack traces | Assembling traces, `checkpoint`, `log` |
| Thread model | Millions of cheap virtual threads (default) | ~8 event-loop threads |
| Non-blocking I/O stack | Blocking APIs (JDBC, JPA), fine because VTs are cheap | End-to-end non-blocking (R2DBC, reactive Kafka) |

**Rule of thumb:** Spring Boot 4 defaults to virtual threads for MVC, and this is the right choice for **most applications**. Use WebFlux when you specifically need true non-blocking I/O: R2DBC for fully async database access, backpressure-aware streaming, high-throughput event sourcing, or when your entire stack must be non-blocking. They work well together. You can even use reactive Kafka in a virtual-thread MVC app.

## When NOT to Use Reactive

-   **CPU-bound work** (crypto, image processing, heavy algorithms): reactive adds thread-pool overhead; tight loops are faster on plain threads.
-   **Simple batch jobs** with no I/O: the operator boilerplate outweighs the benefit.
-   **Team unfamiliar with reactive:** debugging async pipelines has a steep learning curve. A bug in a `flatMap` chain can take hours to trace.
-   **Mostly blocking JDBC:** wrapping `JpaRepository` in `Mono.fromCallable().subscribeOn(boundedElastic)` works, but it negates the scalability benefit and is confusing for future maintainers.
-   **Existing JPA codebase:** JPA is inherently blocking. Mixing reactive and blocking in the same codebase creates a cognitive load that outweighs the throughput gain.

## Module 08 Review

Module 08 covered the reactive programming paradigm end-to-end:

| Lesson | Core Idea |
| --- | --- |
| 45: Reactive Paradigm & C10K | Why blocking doesn't scale; async data streams as the answer |
| 46: Reactive Streams Spec | `Publisher`, `Subscriber`, `Subscription`, backpressure as a first-class contract |
| 47: Mono & Flux Basics | Project Reactor's two types; factories, operators, schedulers |
| 48: Error Handling & Hot vs Cold | `onErrorResume`, `retryWhen`; cold (per-subscriber) vs hot (shared) publishers |
| 49: WebFlux, Virtual Threads & Review | Reactive endpoints, R2DBC, reactive Kafka, and when to skip reactive entirely |

The through-line: **reactive is an I/O scalability strategy for truly non-blocking stacks, not a universal architecture.** Spring Boot 4 defaults to virtual threads for MVC, which solves the threading problem for most applications without any reactive code. Use WebFlux when you need end-to-end non-blocking I/O with R2DBC, backpressure-aware streaming, or event-driven pipelines. Use Spring MVC with virtual threads for everything else.

**Primary sources:** [Spring WebFlux Reference](https://docs.spring.io/spring-framework/reference/web/webflux.html) · [Spring Data R2DBC Reference](https://docs.spring.io/spring-data/r2dbc/reference/) · [Spring Kafka Reactive](https://docs.spring.io/spring-kafka/reference/reactive.html) · [JEP 444: Virtual Threads](https://openjdk.org/jeps/444) · [Project Reactor Reference](https://projectreactor.io/docs/core/release/reference/)

## Check your understanding

<details>
<summary>1. In a Spring WebFlux controller, when does the reactive pipeline actually execute?</summary>
<p><strong>Correct answer:</strong> When the WebFlux framework subscribes to the returned Mono or Flux</p>
</details>

<details>
<summary>2. In a Spring Boot 4 MVC app using JPA, a virtual thread calls orderRepo.findById(), which blocks on JDBC. What happens to the carrier thread?</summary>
<p><strong>Correct answer:</strong> The JVM unmounts the virtual thread and the carrier thread runs another virtual thread</p>
</details>

<details>
<summary>3. A WebFlux endpoint calls orderRepo.findAll() on a JPA JpaRepository and wraps it: Mono.fromCallable(() -> repo.findAll()).subscribeOn(boundedElastic). Why is this still problematic at scale?</summary>
<p><strong>Correct answer:</strong> Blocking JDBC ties up boundedElastic threads, negating the non-blocking scalability model</p>
</details>

<details>
<summary>4. Which combination gives you backpressure-aware streaming of Kafka records with a fully non-blocking database layer?</summary>
<p><strong>Correct answer:</strong> Spring WebFlux + ReactiveKafkaConsumerTemplate + R2DBC</p>
</details>

<details>
<summary>5. Your team has a mature Spring MVC + JPA codebase, runs Java 21, and handles 200 concurrent users. Should you migrate to WebFlux?</summary>
<p><strong>Correct answer:</strong> No, 200 users is well within MVC capacity. Virtual threads are already enabled by default in Boot 4, so keep JPA</p>
</details>
