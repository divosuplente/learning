---
title: "Lesson 38: Serialization, Error Handling & Dead Letter Queues"
description: "Lesson 38: Serialization, Error Handling & Dead Letter Queues"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0038-kafka-serialization-and-error-handling.html
---

# Serialization, Error Handling & Dead Letter Queues

Kafka stores bytes, not Java objects. Getting your events safely across that boundary requires serialization on the way in and deserialization on the way out. When deserialization fails or a consumer throws, you need a strategy beyond "crash and loop." This lesson covers the JSON type-header mechanism, the trusted-packages security gate, error handling with `@RetryableTopic`, and Dead Letter Queues.

## Serialization: Java Object → JSON Bytes

When a producer calls `kafkaTemplate.send()`, the **value-serializer** converts the Java object to bytes before Kafka stores it. With `JsonSerializer`, two things happen:

```
Java Object (OrderCreatedEvent)
  → JsonSerializer converts to JSON string
  → JsonSerializer adds a __TypeId__ header = "com.example...OrderCreatedEvent"
  → Kafka stores: [headers + JSON bytes]
```

The `__TypeId__` header is the class name of the original object. The consumer needs it: without it, the deserializer only sees raw JSON and cannot know whether to build an `OrderCreatedEvent` or an `OrderStatusChangedEvent`.

## Deserialization: JSON Bytes → Java Object

On the consumer side, `JsonDeserializer` reads the `__TypeId__` header, resolves it to a Java class, and uses Jackson to map the JSON fields into a new instance of that class.

```
Kafka stored bytes
  → JsonDeserializer reads __TypeId__ header
  → JsonDeserializer resolves the fully-qualified class name
  → Jackson maps JSON fields → Java record fields
  → Your @KafkaListener receives a typed object
```

This is why your consumer method's parameter type must match the producer's event type: Spring uses the header, not the method signature, to decide which class to instantiate.

## Trusted Packages: The Security Gate

Deserializing JSON into an arbitrary class is dangerous: a malicious producer could set `__TypeId__` to something like `java.lang.ProcessBuilder` and trigger code execution on the consumer. Spring blocks this by requiring you to explicitly list which packages are safe to deserialize from:

```
spring:
  kafka:
    consumer:
      properties:
        spring.json.trusted.packages: "com.example.ordermgmt.kafka.event"
```

You can use `"*"` to trust everything, convenient for development but dangerous for production. The default (no config) trusts *nothing*, and every deserialization will fail with an exception like:

```
org.springframework.kafka.support.serializer.JsonDeserializer:
  This package is not trusted
```

If you add a new event class in a different package and forget to add that package to `trusted.packages`, your consumer will silently reject those messages.

## What Happens When a Consumer Fails?

Without error handling, a consumer that throws an exception creates a **poison pill**: Kafka keeps the message, the consumer keeps reading it, keeps failing, and never advances. The consumer is stuck in an infinite retry loop on a single bad message while every subsequent message waits behind it.

Spring Kafka provides three layers of defense:

1.  **Retry topics**: automatically move the message to a retry topic with a delay, so the main consumer continues.
2.  **Exponential backoff**: wait longer between each retry (1 s, 2 s, 4 s) to give transient issues time to resolve.
3.  **Dead Letter Queue**: after all retries are exhausted, send the message to a DLT for manual inspection.

## @RetryableTopic: Automatic Retries and DLQ

The `@RetryableTopic` annotation creates the retry topics and the dead letter topic automatically:

```
@RetryableTopic(
        attempts = "3",                                    // 3 total attempts
        backoff = @Backoff(delay = 1000, multiplier = 2), // 1s, 2s between retries
        dltTopic = "order-events-dlt",                     // where failed messages land
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE
)
@KafkaListener(
        topics = "order-events",
        groupId = "ordermgmt-notification-group"
)
public void handleOrderCreated(OrderCreatedEvent event) {
    if (event.customerName() == null || event.customerName().isBlank()) {
        throw new RuntimeException("Cannot process order: customer name is blank");
    }
    log.info("processed orderId={}", event.orderId());
}
```

Spring creates these topics behind the scenes:

```
order-events               ← main topic (first attempt)
order-events-retry-0       ← second attempt (after 1 s delay)
order-events-retry-1       ← third attempt (after 2 s delay)
order-events-dlt           ← dead letter (after all retries exhausted)
```

## Handling the Dead Letter Queue

Messages that fail all retries land in the DLT. You need a listener for them, even if that listener only logs:

```
@KafkaListener(topics = "order-events-dlt", groupId = "ordermgmt-dlt-group")
public void handleDlt(OrderCreatedEvent failedEvent) {
    log.error("dlq_received orderId={} — message failed after 3 retries",
            failedEvent.orderId());
    // Real-world: store in DB, alert ops team, fix data, re-publish
}
```

In production, the DLT handler typically persists the failed message, sends an alert, and provides a manual re-publish path. The point is that the main consumer **never blocks**: a bad message is quarantined, not retried infinitely.

## The Full Error-Handling Flow

```
Message arrives at order-events
  → Consumer processes it
     ├─ Success → done, offset advances
     └─ Exception → moved to order-events-retry-0 (delay 1 s)
          → Consumer retries it
             ├─ Success → done
             └─ Exception → moved to order-events-retry-1 (delay 2 s)
                  → Consumer retries it
                     ├─ Success → done
                     └─ Exception → moved to order-events-dlt
                          → DLT handler logs/alerts
                          → Operations investigates and re-publishes
```

**Primary sources:** [Spring Kafka: Serialization](https://docs.spring.io/spring-kafka/reference/serialization.html) · [Spring Kafka: Retry Topics & DLQ](https://docs.spring.io/spring-kafka/reference/retrytopic.html) · [Spring Kafka: Error Handling](https://docs.spring.io/spring-kafka/reference/error-handling.html)

## Check your understanding

<details>
<summary>1. What does the __TypeId__ header added by JsonSerializer contain?</summary>
<p><strong>Correct answer:</strong> The fully-qualified class name of the serialized Java object</p>
</details>

<details>
<summary>2. You add a new event class in com.example.ordermgmt.billing.event but forget to update spring.json.trusted.packages. What happens to those messages?</summary>
<p><strong>Correct answer:</strong> They are rejected: the deserializer throws a "package is not trusted" exception</p>
</details>

<details>
<summary>3. A consumer throws an exception on every message and has no error handling configured. What is the result?</summary>
<p><strong>Correct answer:</strong> The consumer keeps retrying the same message indefinitely: a poison pill</p>
</details>

<details>
<summary>4. With @RetryableTopic(attempts = "3", backoff = @Backoff(delay = 1000, multiplier = 2)), how many topics does Spring create for retries (not counting the main topic and DLT)?</summary>
<p><strong>Correct answer:</strong> 2 retry topics (retry-0 and retry-1)</p>
</details>

<details>
<summary>5. Setting spring.json.trusted.packages to "*" means the consumer will deserialize classes from any package. Why is this dangerous in production?</summary>
<p><strong>Correct answer:</strong> A malicious producer could set __TypeId__ to a dangerous class and trigger arbitrary code execution</p>
</details>
