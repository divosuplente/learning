---
title: "Reactive Programming Paradigm & the C10K Problem"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/08-reactor-pattern/0045-reactive-programming-paradigm.md
---

Every I/O operation your code performs (a database query, an HTTP call, reading a file) takes time. The question is: **what does your thread do while it waits?** If the answer is "nothing," you're writing blocking code. Reactive programming flips the model: your thread never waits. It moves on, and gets notified when the result arrives.

## Imperative vs Reactive: An Analogy

Think of a restaurant.

**Imperative (blocking)** is a **waiter who takes one order, stands in the kitchen until the food is ready, delivers it, and only then takes the next order.** The whole restaurant stalls while the kitchen cooks.

**Reactive (non-blocking)** is a **ticket system on a conveyor belt.** Orders are placed as tickets. Multiple workers pick up tickets as they become ready, processing them in parallel without waiting. The waiter is free to take new orders immediately.

| Imperative (Blocking) | Reactive (Non-Blocking) |
| --- | --- |
| `Thread.sleep(1000)`: thread blocked, doing nothing | `Flux.interval(Duration.ofSeconds(1))`: thread is free between emissions |
| You **ask** for data and **wait** | You **subscribe** to data and get **notified** |
| Calling thread is occupied for the entire operation | Calling thread initiates the operation and returns immediately |

## A Concrete Example

**Imperative (blocking):**

```
// Blocks the calling thread for the entire duration
List<Order> orders = orderRepository.findAll();  // blocks on DB I/O
List<OrderDto> dtos = orders.stream()
        .map(this::toDto)                         // blocks on CPU
        .toList();
return dtos;  // caller was waiting the entire time
```

**Reactive (non-blocking):**

```
// Returns immediately; the caller subscribes and gets notified
Flux<OrderDto> dtos = orderRepository.findAll()     // returns Flux, no blocking
        .map(this::toDto)                            // transforms each item as it arrives
        .doOnNext(dto -> log.info("Processed {}", dto.id()));
// Nothing has executed yet! The caller must .subscribe()
return dtos;
```

The key insight: **nothing happens until someone subscribes.** The reactive pipeline is a *declaration* of what should happen, not an immediate execution. This is fundamentally different from imperative code, where each line executes before the next.

## Why Reactive? The C10K Problem

The **C10K problem** refers to the challenge of handling 10,000+ concurrent connections on a single server. In the traditional **thread-per-request** model:

-   Each connection needs a dedicated OS thread
-   Each thread consumes **~1 MB of stack memory**
-   10,000 threads = **~10 GB of memory** just for thread stacks
-   Context switching between 10,000 threads wastes CPU cycles
-   Most threads are **blocked on I/O**, waiting for database, HTTP, or file reads, doing nothing at all

You're paying for 10,000 threads, but at any given moment most of them are idle, waiting for I/O to complete. The server runs out of memory before it runs out of CPU.

## How Reactive Solves This

Reactive frameworks use a **small pool of threads** (typically 2× CPU cores) and **non-blocking I/O**. When a thread initiates an I/O operation, it doesn't wait. It moves on to the next task. When the I/O completes, a callback fires on one of the available threads.

| Thread-Per-Request (Blocking) | Reactive (Non-Blocking) |
| --- | --- |
| 10,000 connections = 10,000 threads | 10,000 connections = ~8 threads |
| ~10 GB memory for thread stacks | ~8 MB memory for thread stacks |
| Threads blocked on I/O waste CPU | Threads always doing useful work |
| Scaling requires more hardware | Scaling requires better I/O utilization |

10,000 threads × 1 MB per stack = 10 GB of memory consumed before your application code even runs. With reactive, the same 10,000 connections share a handful of threads, and memory usage stays flat as connections grow.

## When Java 21 Virtual Threads Help

Java 21's **virtual threads** (Project Loom) offer an alternative: lightweight threads that can be blocked without wasting OS resources. Virtual threads make *blocking code scale*, but they don't give you the pipeline composition, backpressure, and stream operators that Reactor provides. Virtual threads and Reactor work well together. We'll revisit this trade-off in Lesson 49.

**Primary sources:** [Reactive Streams Specification](https://www.reactive-streams.org/) · [Project Reactor Reference](https://projectreactor.io/docs/core/release/reference/) · [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)

## Check your understanding

<details>
<summary>1. In the restaurant analogy, what does the "ticket system" represent?</summary>
<p><strong>Correct answer:</strong> Non-blocking I/O: workers pick up tasks as they arrive without waiting</p>
</details>

<details>
<summary>2. In a thread-per-request model with 10,000 concurrent connections, approximately how much memory is consumed just by thread stacks?</summary>
<p><strong>Correct answer:</strong> ~10 GB (1 MB per thread)</p>
</details>

<details>
<summary>3. When you write Flux dtos = repository.findAll().map(this::toDto);, when does the database query actually execute?</summary>
<p><strong>Correct answer:</strong> Only when someone calls .subscribe() on the returned Flux</p>
</details>

<details>
<summary>4. A reactive server handles 10,000 connections with ~8 threads. What allows a single thread to serve multiple connections simultaneously?</summary>
<p><strong>Correct answer:</strong> The thread initiates I/O and moves on; a callback fires when the I/O completes</p>
</details>

<details>
<summary>5. Virtual threads (Java 21) and reactive programming (Project Reactor) are described as complementary. What does Reactor provide that virtual threads alone do not?</summary>
<p><strong>Correct answer:</strong> Pipeline composition, backpressure, and stream operators</p>
</details>
