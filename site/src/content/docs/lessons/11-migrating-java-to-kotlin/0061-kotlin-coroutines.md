---
title: "Kotlin Coroutines vs Reactor Mono/Flux"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/11-migrating-java-to-kotlin/0061-kotlin-coroutines.md
---

In Module 08 you learned Reactor's `Mono` and `Flux`, declarative pipelines that model async data flows. Kotlin offers an alternative: **coroutines**, which let you write non-blocking code that *looks synchronous*. This lesson covers `suspend` functions, `Flow`, structured concurrency, and when to pick coroutines over Reactor.

## Why Coroutines?

Reactive pipelines chain operators like `.map()`, `.flatMap()`, and `.onErrorResume()`. The resulting code is capable but hard to read: the control flow is spread across a declaration chain, stack traces are opaque, and debugging a `flatMap` chain can take hours.

Coroutines solve the same non-blocking problem with a different trade-off: **the compiler transforms your synchronous-looking code into a state machine** that suspends and resumes at every `suspend` point. You get imperative style (`try`/`catch`, loops, variables) without blocking a thread.

| Reactor (Java) | Coroutines (Kotlin) |
| --- | --- |
| `Mono<Order>` | `suspend fun getOrder(): Order` |
| `Flux<Order>` | `Flow<Order>` |
| `.map(it -> ...)` | direct code (synchronous-looking) |
| `.flatMap(...)` | direct code (synchronous-looking) |
| `.subscribe()` | coroutine builder (`launch { }`, `runBlocking { }`) |
| `StepVerifier` | direct assertions on `suspend` results |

## The `suspend` Keyword

A function marked `suspend` can **pause execution** without blocking the calling thread. When a `suspend` function hits an awaitable operation, the coroutine suspends and the thread is freed to do other work. When the result is ready, the coroutine resumes exactly where it left off.

```
// A suspending function — non-blocking but looks synchronous
suspend fun findById(id: Long): Order? {
    val row = dbQuery(id)   // suspends here, thread is free
    return row?.toOrder()   // resumes when dbQuery returns
}
```

**Critical rule:** a `suspend` function can *only* be called from a coroutine or another `suspend` function. Calling it from regular code is a compile error. This is Kotlin's way of ensuring suspension context is always available.

```
// WON'T COMPILE — suspend function called from non-suspend context
fun main() {
    findById(1L)   // Error: Suspend function 'findById' should be called only from a coroutine or another suspend function
}

// CORRECT — call from a coroutine scope
fun main() = runBlocking {
    val order = findById(1L)   // OK — inside a coroutine
    println(order)
}
```

## Adding Coroutine Support

Add the coroutines dependencies to your `pom.xml`:

```
<dependency>
    <groupId>org.jetbrains.kotlinx</groupId>
    <artifactId>kotlinx-coroutines-core</artifactId>
    <version>1.8.1</version>
</dependency>
<dependency>
    <groupId>org.jetbrains.kotlinx</groupId>
    <artifactId>kotlinx-coroutines-reactor</artifactId>
    <version>1.8.1</version>
</dependency>
```

The `kotlinx-coroutines-reactor` module provides interoperability: you can convert between `Mono`/`Flux` and `suspend`/`Flow` when mixing Java and Kotlin code.

## Coroutine Controller Example

Spring WebFlux understands `suspend` functions natively. When a controller method is marked `suspend`, Spring subscribes to the coroutine automatically. No `Mono` wrapping needed.

```
@RestController
@RequestMapping("/api/coroutine/orders")
class CoroutineOrderController(
    private val service: CoroutineOrderService
) {
    @GetMapping
    suspend fun findAll(): List<OrderResponse> =
        service.findAll()   // looks synchronous, runs non-blocking

    @GetMapping("/{id}")
    suspend fun findById(@PathVariable id: Long): OrderResponse =
        service.findById(id)   // no Mono wrapping needed

    @GetMapping("/{id}/status/stream", produces = ["text/event-stream"])
    fun streamStatus(@PathVariable id: Long): Flow<OrderStatus> =
        service.streamStatusUpdates(id)   // Flow replaces Flux

    @PostMapping
    suspend fun create(@Valid @RequestBody request: CreateOrderRequest): OrderResponse =
        service.createOrder(request)
}
```

Note three patterns:

-   **Single value** → `suspend fun` returning the type directly (replaces `Mono<T>`)
-   **Stream of values** → `fun` returning `Flow<T>` (replaces `Flux<T>`)
-   **SSE endpoint** → `Flow` with `produces = ["text/event-stream"]`, same as `Flux`

## Coroutine Service Example

```
@Service
class CoroutineOrderService(
    private val orderRepository: OrderRepository
) {
    // suspending function — non-blocking but looks synchronous
    suspend fun findAll(): List<OrderResponse> =
        orderRepository.findAll().map { OrderResponse.from(it) }

    suspend fun findById(id: Long): OrderResponse =
        orderRepository.findById(id)
            ?.let { OrderResponse.from(it) }
            ?: throw IllegalArgumentException("Order not found: $id")

    @Transactional
    suspend fun createOrder(request: CreateOrderRequest): OrderResponse {
        val order = OrderEntity().apply {
            // build order
        }
        val saved = orderRepository.save(order)
        return OrderResponse.from(saved)
    }

    // Flow replaces Flux — cold stream that produces items lazily
    fun streamStatusUpdates(orderId: Long): Flow<OrderStatus> = flow {
        var current = orderRepository.findById(orderId)?.status
        while (current != OrderStatus.DELIVERED && current != OrderStatus.CANCELLED) {
            delay(1000)  // suspends — no thread blocked
            val updated = orderRepository.findById(orderId)?.status
            if (updated != current) {
                current = updated
                emit(current!!)
            }
        }
    }
}
```

**Important:** `@Transactional` on a `suspend` function requires **Spring 6.2+** with coroutine-aware transaction management. In earlier versions, `@Transactional` uses `ThreadLocal`\-based context. When a coroutine suspends and resumes on a different thread, the transaction is lost. Spring 6.2 introduced `CoroutineTransactionManager` that propagates the transaction through the coroutine context instead. If you are on an earlier version, use `TransactionalOperator` or wrap the call in a blocking transaction boundary.

The `delay()` call is a **suspending function**. Unlike `Thread.sleep()`, it does not occupy a thread. The coroutine suspends, the thread moves on, and the coroutine resumes after the delay.

## Flow: Coroutine's Flux

`Flow<T>` is the coroutine equivalent of `Flux<T>`. It is a **cold** stream: nothing happens until a collector subscribes, and each collector gets its own independent stream.

```
fun countdown(from: Int): Flow<Int> = flow {
    for (i in from downTo 1) {
        emit(i)       // emit one value to the collector
        delay(1000)   // suspend 1 second between emissions
    }
}

// Collecting a Flow — this suspends until the flow completes
suspend fun main() {
    countdown(5).collect { value ->
        println(value)   // prints 5, 4, 3, 2, 1 (one per second)
    }
}
```

Flow operators look like collection operators, not Reactor operators:

```
countdown(10)
    .map { it * 2 }               // transform each value
    .filter { it > 10 }           // keep values > 10
    .take(3)                       // take first 3 matching values
    .collect { println(it) }
```

There is no `.subscribe()`. `collect` is a `suspend` function that processes the entire flow. Error handling uses plain `try`/`catch`.

## Structured Concurrency

Every coroutine runs inside a **CoroutineScope**, which defines its lifetime. When the scope ends, all child coroutines are cancelled. This discipline, **structured concurrency**, prevents leaked coroutines and ensures resources are cleaned up.

```
runBlocking {                          // scope 1 — lives until the block ends
    launch {                           // child coroutine of scope 1
        delay(2000)
        println("child 1 done")
    }
    launch {                           // another child of scope 1
        delay(1000)
        println("child 2 done")
    }
    // runBlocking waits for both children to finish
}
```

If a child coroutine throws an exception, structured concurrency cancels its siblings and propagates the failure up. No orphaned work, no silent hangs.

## `Flow` vs `Flux`: Key Differences

| Aspect | Flux (Reactor) | Flow (Coroutines) |
| --- | --- | --- |
| Backpressure | Explicit via `Subscription.request(n)` | Implicit: collector pulls via `suspend` |
| Cold vs Hot | Cold by default; `share()`/`cache()` for hot | Cold by default; `StateFlow`/`SharedFlow` for hot |
| Error handling | `onErrorResume`, `onErrorMap` | Standard `try`/`catch` |
| Lifecycle | Managed by Reactor's `Disposable` | Managed by structured concurrency scope |
| Operators | Rich library (~100+ operators) | Smaller set; use suspend for complex logic |
| Thread model | Event-loop schedulers | Dispatchers (`Dispatchers.Default`, `IO`) |

## Interoperability: Mixing Coroutines and Reactor

In a mixed Java/Kotlin codebase, you will need to convert between the two models. The `kotlinx-coroutines-reactor` module provides bridges:

```
// Mono → suspend
suspend fun getOrder(id: Long): Order =
    orderMono(id).awaitSingle()       // Mono<Order> → Order

// Flux → Flow
fun allOrders(): Flow<Order> =
    ordersFlux().asFlow()             // Flux<Order> → Flow<Order>

// suspend → Mono
fun getOrderMono(id: Long): Mono<Order> =
    mono { getOrder(id) }             // suspend → Mono<Order>

// Flow → Flux
fun allOrdersFlux(): Flux<Order> =
    allOrdersFlow().asFlux()          // Flow<Order> → Flux<Order>
```

This lets you call Java Reactor-based services from Kotlin coroutines and vice versa. No rewrite needed.

## Coroutine R2DBC Repositories

Spring Data R2DBC supports coroutines directly. When you write a Kotlin interface extending `R2dbcRepository`, Spring generates `suspend` and `Flow`\-based methods:

```
@Repository
interface ReactiveOrderRepository : R2dbcRepository<OrderEntity, Long> {
    fun findByStatus(status: OrderStatus): Flow<OrderEntity>   // replaces Flux
    suspend fun findById(id: Long): OrderEntity?              // replaces Mono
}
```

No `Mono` or `Flux` in sight. The repository speaks coroutine types, and your service layer stays imperative.

## When to Use Coroutines vs Reactor

| Factor | Choose Coroutines | Choose Reactor |
| --- | --- | --- |
| Language | Kotlin-first project | Java-only project |
| Code readability | Imperative style preferred | Declarative pipeline style preferred |
| Stack traces | Normal, readable traces | Assembly-time traces, harder to debug |
| Operator library | Common cases; complex logic via suspend | Rich operators (~100+) for specialized transforms |
| Team experience | Team knows Kotlin | Team knows Reactor |
| Hot streams / caching | `StateFlow`, `SharedFlow` | `.share()`, `.cache()`, `retryWhen` |

**Rule of thumb:** If your project is Kotlin, prefer coroutines: you get the same non-blocking behavior with far simpler code. If your project is Java-only, Reactor is your only option. In mixed projects, use the interop bridges at module boundaries.

**Primary sources:** [Kotlin Coroutines Guide](https://kotlinlang.org/docs/coroutines-guide.html) · [Spring Kotlin Coroutines](https://docs.spring.io/spring-framework/reference/languages/kotlin/coroutines.html) · [Kotlin Flow Guide](https://kotlinlang.org/docs/flow.html) · [Project Reactor Reference](https://projectreactor.io/docs/core/release/reference/)

## Check your understanding

<details>
<summary>1. What happens if you call a suspend function from a regular (non-suspend) function?</summary>
<p><strong>Correct answer:</strong> Compilation error: suspend functions can only be called from a coroutine or another suspend function</p>
</details>

<details>
<summary>2. In a Spring WebFlux controller, what is the coroutine equivalent of returning Mono?</summary>
<p><strong>Correct answer:</strong> A suspend fun returning Order directly</p>
</details>

<details>
<summary>3. What does delay(1000) do inside a coroutine, compared to Thread.sleep(1000)?</summary>
<p><strong>Correct answer:</strong> delay suspends the coroutine and frees the thread; sleep blocks the thread entirely</p>
</details>

<details>
<summary>4. What does structured concurrency guarantee when a child coroutine throws an exception?</summary>
<p><strong>Correct answer:</strong> Sibling coroutines are cancelled and the exception propagates to the parent scope</p>
</details>

<details>
<summary>5. You have a Java-only Spring WebFlux service returning Flux. A new Kotlin module needs to consume it using coroutines. What is the correct approach?</summary>
<p><strong>Correct answer:</strong> Use flux.asFlow() from kotlinx-coroutines-reactor to convert Flux to Flow</p>
</details>
