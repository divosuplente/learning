---
title: "Lesson 39: Delivery Semantics, Idempotency & Module Review"
description: "Lesson 39: Delivery Semantics, Idempotency & Module Review"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/06-kafka/0039-kafka-delivery-semantics.md
---

# Delivery Semantics, Idempotency & Module Review

Kafka's default is **at-least-once** delivery: messages are never lost but may arrive twice. This lesson explains the three delivery guarantees, shows how to make your consumers safe against duplicates, and reviews everything from Module 06.

## The Three Delivery Guarantees

When a consumer reads a message, two things have to happen: **process the message** and **commit the offset** (tell Kafka "I'm past this point"). The order of those two steps determines the delivery semantic.

### At-Most-Once

The consumer commits the offset *before* processing. If it crashes mid-processing, the message is lost: Kafka already marked it as consumed.

```
// Offset committed immediately on read
[read msg] → [commit offset] → [process] → [CRASH!]
                                        message is lost
```

**Use when:** losing occasional messages is acceptable, for example non-critical analytics where a missing data point won't matter.

### At-Least-Once (Default in Spring Boot)

The consumer processes the message *first*, then commits the offset. If it crashes after processing but before committing, Kafka will redeliver the message on restart.

```
[read msg] → [process] → [CRASH before commit!]
                         message will be re-delivered
```

**Use when:** you can't lose messages and you can handle duplicates. This is the most common choice and the Spring Boot default.

### Exactly-Once

Messages are neither lost nor duplicated. This requires Kafka transactions: the producer and consumer coordinate so that the message processing and offset commit happen atomically.

```
// Kafka transaction: both succeed or both roll back
[read msg] → [begin transaction] → [process] → [commit offset + transaction]
                                     atomic: no gap for a crash
```

The cost is complexity and reduced throughput. Enable it with:

```
// Producer side
spring.kafka.producer.transaction-id-prefix: order-txn-

// Consumer side: read only committed transactions
spring.kafka.consumer.isolation-level: read_committed
```

**Use when:** duplicates would cause serious problems, such as financial transactions, billing, or inventory decrements where a second debit is unacceptable.

## Comparison

| Semantic | Lost messages? | Duplicate messages? | Complexity |
| --- | --- | --- | --- |
| At-most-once | Yes | No | Low |
| At-least-once | No | Yes | Low |
| Exactly-once | No | No | High |

Because at-least-once is the default, the practical question becomes: **how do you handle the duplicates?** The answer is idempotency.

## Idempotent Consumers

An operation is **idempotent** if doing it once has the same result as doing it many times.

| Operation | Idempotent? | Why |
| --- | --- | --- |
| `balance += 10` | No | Each call adds another $10 |
| `status = CONFIRMED` | Yes | Setting it again changes nothing |
| Create order if not exists (check by ID) | Yes | Second call finds it already exists |

The key technique: **check if the work was already done before doing it.** Use a unique identifier (typically the event's business key) and a database check.

```
@Component
public class OrderEventConsumer {

    private final OrderRepository orderRepository;

    public OrderEventConsumer(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @KafkaListener(topics = "order-events", groupId = "ordermgmt-group")
    @Transactional
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Idempotency guard: skip if already processed
        if (orderRepository.existsById(event.orderId())) {
            log.info("skipping_duplicate orderId={}", event.orderId());
            return;
        }

        // Safe to process: first time we've seen this message
        OrderEntity order = new OrderEntity();
        order.setId(event.orderId());
        // ... set fields from event ...
        orderRepository.save(order);
    }
}
```

The `@Transactional` annotation ensures the idempotency check and the business logic execute atomically. Without it, a crash between the check and the save could leave the system in an inconsistent state: the message would be redelivered, the check would pass again, and you'd get a duplicate.

For high-throughput systems, maintaining a separate **processed-message table** (storing message IDs or offset+partition) is more robust than relying on the business entity existing: it works even when the business operation doesn't create an entity.

```
// Alternative: explicit deduplication table
if (processedMessageRepository.existsById(event.messageId())) {
    return; // already handled
}
// ... process message ...
processedMessageRepository.save(new ProcessedMessage(event.messageId()));
```

## Module 06 Review

Module 06 covered Apache Kafka from first principles to production-ready consumers:

| Lesson | Core Idea | Key Concept / Pattern |
| --- | --- | --- |
| 35: Sync vs Async | Synchronous waits; asynchronous fires and forgets | Loose coupling via message broker |
| 36: Kafka Concepts | Topics, partitions, offsets, consumer groups, brokers | Partition = ordered append-only log; offset = position |
| 37: Spring Kafka | Producers send with `KafkaTemplate`; consumers listen with `@KafkaListener` | Key-based partitioning preserves ordering |
| 38: Serialization & Errors | JSON serialization via `__TypeId__` headers; `@RetryableTopic` + DLQ for failures | Poison pill → retry topics → dead letter queue |
| 39: Semantics & Idempotency | At-least-once default means possible duplicates; idempotent guards prevent double-processing | `existsById()` check + `@Transactional` |

Event flow through the Order Management System:

```
OrderService (producer)
  → KafkaTemplate.send("order-events", orderId, event)
    → Kafka topic: order-events (partitions by orderId key)
      → @KafkaListener (notification-group) → send confirmation email
      → @KafkaListener (analytics-group)    → update dashboard
      → @RetryableTopic → retry-0 → retry-1 → DLT (exhausted retries)
```

**Primary sources:** [Kafka: Delivery Guarantees](https://kafka.apache.org/documentation/#design_deliverysemantics) · [Spring Kafka: @KafkaListener](https://docs.spring.io/spring-kafka/reference/kafka/receiving.html) · [Spring Kafka: Retry and DLQ](https://docs.spring.io/spring-kafka/reference/kafka/retrytopic.html)

## Check your understanding

<details>
<summary>1. A consumer using at-least-once semantics crashes after processing a message but before committing the offset. What happens?</summary>
<p><strong>Correct answer:</strong> The message is redelivered: the consumer will process it again on restart</p>
</details>

<details>
<summary>2. Which operation is not idempotent?</summary>
<p><strong>Correct answer:</strong> Adding $10 to a customer balance with balance += 10</p>
</details>

<details>
<summary>3. In at-most-once delivery, why can a message be lost?</summary>
<p><strong>Correct answer:</strong> The offset is committed before the message is processed</p>
</details>

<details>
<summary>4. An idempotent consumer checks orderRepository.existsById(event.orderId()) but the method has no @Transactional. Why is this a problem?</summary>
<p><strong>Correct answer:</strong> A crash between the check and the save could cause a duplicate on redelivery</p>
</details>

<details>
<summary>5. Which delivery semantic does Spring Boot Kafka use by default?</summary>
<p><strong>Correct answer:</strong> At-least-once: messages may be duplicated but never lost</p>
</details>
