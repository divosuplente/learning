---
title: "Lesson 36: Kafka Core Concepts: Topics, Partitions, Offsets, Consumer Groups"
description: "Lesson 36: Kafka Core Concepts: Topics, Partitions, Offsets, Consumer Groups"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/06-kafka/0036-kafka-core-concepts.md
---

# Kafka Core Concepts: Topics, Partitions, Offsets, Consumer Groups

Kafka stores and routes millions of messages per second using a small set of abstractions. This lesson makes each one concrete with the **newsstand analogy**, then shows how they fit together in a real architecture.

## The Newsstand

Imagine a newsstand that never runs out of shelf space:

1.  **Publishers** deliver newspapers to the newsstand: these are Kafka *producers*.
2.  The newsstand organizes papers into sections (*Sports*, *Politics*, *Tech*): these are *topics*.
3.  Each section has multiple shelves: these are *partitions*.
4.  Every paper on a shelf has a numbered slot: that number is the *offset*.
5.  Subscribers pick up papers from sections they care about: these are *consumers*.
6.  A group of subscribers who share a section (one shelf each) forms a *consumer group*.
7.  The newsstand itself (the building and its manager) is a *broker*.

Papers stay on the shelf until they expire. Subscribers remember the last slot they read, so they can pick up where they left off the next day.

## Topic

A **topic** is a named category for messages. Producers write to a topic; consumers read from it. Think of it as a folder: everything about `order-events` goes into the same topic.

```
Topic: order-events
├── Partition 0: [msg1, msg2, msg3, msg4, msg5]
├── Partition 1: [msg1, msg2, msg3]
└── Partition 2: [msg1, msg2, msg3, msg4, msg5, msg6, msg7]
```

Topics are cheap. A Kafka cluster can handle thousands. You create one per event type or per domain stream: `order-events`, `payment-events`, `user-signups`.

## Partition

Each topic is split into one or more **partitions**: ordered, append-only logs. New messages go to the end. Partitions are how Kafka scales: they can live on different brokers, allowing parallel reads and writes.

```
Topic: order-events (3 partitions)

Partition 0:  [OrderCreated] [OrderConfirmed] [OrderShipped]
Partition 1:  [OrderCreated] [OrderCancelled]
Partition 2:  [OrderCreated] [OrderConfirmed] [OrderShipped] [OrderDelivered]
```

**Key rule:** messages within a single partition are strictly ordered: you read them in the order they were written. **Across partitions, there is no guaranteed order.** A consumer might see `OrderShipped` on Partition 0 before `OrderCreated` on Partition 1. If you need total ordering for a specific entity, send all its events to the same partition using a **message key** (e.g., `orderId`).

## Offset

Every message in a partition gets a sequential **offset**: an immutable, monotonically increasing integer starting at 0. It works like a page number: each consumer tracks its own offset, remembering "I've read up to offset 5."

```
Partition 0:  [msg at offset 0] [msg at offset 1] [msg at offset 2] [msg at offset 3]
```

Offsets are per-partition. Offset 3 in Partition 0 is a completely different message from offset 3 in Partition 1. Consumers commit their offsets back to Kafka (or to an external store) so they can resume after a restart.

## Consumer Group

A **consumer group** is a set of consumers that cooperate to read a topic. Kafka assigns each partition to **exactly one consumer** within the group. This is the load-balancing mechanism: add more consumers, and they split the partitions among themselves.

```
Topic: order-events (3 partitions)

Consumer Group "notification-service":
  Consumer 1 → reads Partition 0
  Consumer 2 → reads Partition 1
  Consumer 3 → reads Partition 2

Consumer Group "analytics-service":
  Consumer 1 → reads Partition 0, 1, 2 (single consumer reads all)
```

Different consumer groups read independently. The notification group and analytics group both get every message; they just track separate offsets. This is how one event can trigger multiple processes without wiring them together.

If a group has *more consumers than partitions*, the extra consumers sit idle: a partition cannot be shared within a group. A group of 5 consumers reading a 3-partition topic means 2 consumers do no work.

## Broker

A **broker** is a Kafka server. It stores partitions on disk and serves read/write requests. A Kafka cluster is one or more brokers; for development, one is enough. Production typically runs 3+ brokers so that partition replicas can survive a broker failure.

```
Kafka Cluster:
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Broker 1 │  │ Broker 2 │  │ Broker 3 │
│ (leader) │  │(follower)│  │(follower)│
└──────────┘  └──────────┘  └──────────┘
```

Each partition has a **leader** broker that handles all reads and writes, and zero or more **followers** that replicate the data. If the leader goes down, a follower is promoted automatically.

## Architecture: How It Fits Together

```
┌──────────────┐                    ┌───────────────────┐
│  Order       │  produces          │   Kafka Cluster    │
│  Service     │───────────────────>│                     │
│  (Producer)  │   OrderCreated     │  Topic:             │
└──────────────┘   Event            │  order-events       │
                                     │                     │
┌──────────────┐                    │  ┌───────────────┐ │
│  Notification│  consumes          │  │ Partition 0   │ │
│  Service     │<───────────────────│  │ Partition 1   │ │
│  (Consumer)  │                    │  │ Partition 2   │ │
└──────────────┘                    │  └───────────────┘ │
                                     │                     │
┌──────────────┐                    │                     │
│  Analytics   │  consumes          │                     │
│  Service     │<───────────────────│                     │
│  (Consumer)  │                    │                     │
└──────────────┘                    └───────────────────┘
                (Different consumer groups)
```

The Order Service produces events. The Notification Service and Analytics Service consume them from *different consumer groups*: each group gets every message, each group tracks its own offsets. If Analytics crashes at 3 AM, it resumes from its last committed offset when it comes back. No data lost, no reprocessing needed.

**Primary sources:** [Apache Kafka: Documentation](https://kafka.apache.org/documentation/#gettingStarted) · [Confluent: Kafka Fundamentals](https://docs.confluent.io/platform/current/kafka/fundamentals.html)

## Check your understanding

<details>
<summary>1. A topic has 3 partitions. A producer sends two messages for the same order ID without specifying a message key. Where do they end up?</summary>
<p><strong>Correct answer:</strong> Possibly in different partitions: without a key, assignment is round-robin or random</p>
</details>

<details>
<summary>2. A consumer group has 6 consumers reading a topic with 4 partitions. How many consumers are actively processing messages?</summary>
<p><strong>Correct answer:</strong> 4: each partition is assigned to exactly one consumer; the extra 2 are idle</p>
</details>

<details>
<summary>3. A topic has 2 partitions. Partition 0 contains [A, B, C] and Partition 1 contains [D, E]. Which order is guaranteed?</summary>
<p><strong>Correct answer:</strong> Within Partition 0, B always comes after A; nothing is guaranteed across partitions</p>
</details>

<details>
<summary>4. Two consumer groups (shipping and analytics) both read from order-events. The shipping group has consumed up to offset 10. What does the analytics group see?</summary>
<p><strong>Correct answer:</strong> All messages from its own last committed offset: each group tracks offsets independently</p>
</details>

<details>
<summary>5. What happens to a consumer's position when it crashes and restarts?</summary>
<p><strong>Correct answer:</strong> It resumes from its last committed offset: any uncommitted messages may be reprocessed</p>
</details>
