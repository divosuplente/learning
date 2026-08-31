---
title: "Sync vs Async Communication & What Kafka Solves"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/06-kafka/0035-sync-vs-async.md
---

When two services need to talk, you have two choices: wait for an answer, or fire and forget. The choice sounds simple, but it shapes your entire system's resilience, scalability, and coupling. This lesson covers the difference, when each applies, and why Apache Kafka exists as the standard message broker for async, event-driven architecture.

## Synchronous Communication

In **synchronous** communication, the caller sends a request and **blocks until it gets a response**. Think of a phone call: you stay on the line until the other person answers.

```
Order Service ──"create order"──> Payment Service
                <──"confirmed"──
                (waiting the entire time)
```

**Pros:** Simple to reason about. You get an immediate answer (success or failure) and can proceed or abort right away.

**Cons:** If the payment service is slow or down, the order service is stuck waiting. A timeout in one service cascades as degraded performance in every caller. The services are **tightly coupled**: the caller's fate is bound to the callee's health.

## Asynchronous Communication

In **asynchronous** communication, the sender publishes a message and **continues immediately** without waiting. Think of sending an email: you hit send and move on with your day. The recipient reads it when they're ready.

```
Order Service ──"order created"──> [Message Broker] ──> Payment Service
                                       │
                                       └──> Notification Service
                                       │
                                       └──> Analytics Service
```

**Pros:** The sender never blocks. The receiver processes at its own pace. Multiple receivers can react to the same event independently. Services are **loosely coupled**: a failure in the notification service doesn't block payments.

**Cons:** More complex infrastructure (you need a message broker). **Eventual consistency**: things happen eventually, not immediately. Harder to trace and debug because the flow isn't a single call stack.

## When to Use Which?

| Scenario | Use |
| --- | --- |
| Need an immediate answer ("does this customer exist?") | Synchronous |
| Need to notify multiple systems something happened | Asynchronous |
| The receiver might be slow or temporarily down | Asynchronous |
| The caller cannot proceed without the result | Synchronous |
| Triggering background work (emails, analytics, shipping) | Asynchronous |
| Validating user input before accepting it | Synchronous |

The key insight: **sync is for queries, async is for events.** When you need data to make a decision right now, call synchronously. When something has already happened and others need to know about it, publish asynchronously.

## Why Kafka?

A message broker sits between senders and receivers, storing messages until they're consumed. **Apache Kafka** is the dominant broker for event-driven systems because it was built for scale.

Kafka was created at LinkedIn to handle massive event pipelines (clickstreams, metrics, audit logs) across thousands of services. It is designed to be:

-   **Fast**: millions of messages per second via sequential disk writes and zero-copy reads
-   **Durable**: messages persist on disk, surviving broker restarts
-   **Scalable**: topics split into partitions spread across a cluster
-   **Reliable**: replication across brokers so no single machine is a loss point

The mental model: Kafka is a **post office**. Producers drop off letters. Kafka sorts them by topic. Consumers pick up what they're interested in, at their own pace, without the producer ever knowing or caring who's reading.

```
Publisher                      Kafka                       Subscribers
┌──────────┐           ┌─────────────────┐           ┌──────────┐
│ Order    │──event──> │  topic: orders   │──event──> │ Payment  │
│ Service  │           │  (durable log)   │──event──> │ Notifier │
└──────────┘           └─────────────────┘──event──> │ Analytics│
                                                      └──────────┘
```

The producer and consumers never talk directly. They only agree on the shape of the message. That contract, not a shared database or a live HTTP call, is the coupling point. This is why Kafka is central to **event-driven architecture**: it lets services evolve independently, scale independently, and fail independently.

**Primary sources:** [Apache Kafka: Design](https://kafka.apache.org/documentation/#design) · [Spring Kafka Reference](https://docs.spring.io/spring-kafka/reference/) · [Martin Fowler: Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

## Check your understanding

<details>
<summary>1. An order service calls a payment service over REST and waits for the response before confirming the order. What kind of communication is this?</summary>
<p><strong>Correct answer:</strong> Synchronous: the caller blocks until it gets a response</p>
</details>

<details>
<summary>2. A user submits a registration form and the API must verify the email is not already taken before returning success. Should this use asynchronous communication?</summary>
<p><strong>Correct answer:</strong> No: the caller needs the result to proceed, so synchronous is correct</p>
</details>

<details>
<summary>3. What happens to the order service if the notification service crashes in an async, Kafka-based architecture?</summary>
<p><strong>Correct answer:</strong> Nothing: the order service already moved on; Kafka retains the message until the consumer recovers</p>
</details>

<details>
<summary>4. Which is a real downside of asynchronous communication?</summary>
<p><strong>Correct answer:</strong> Eventual consistency: the system may be in an intermediate state for a while</p>
</details>

<details>
<summary>5. Your system sends an OrderCreated event after persisting an order. The payment service processes it two seconds later. During that gap, a customer queries their order status and sees "unpaid." Is this a bug?</summary>
<p><strong>Correct answer:</strong> No: this is expected with async; the status will converge once the consumer catches up</p>
</details>
