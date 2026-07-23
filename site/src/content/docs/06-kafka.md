---
title: "Module 06: Apache Kafka"
description: "Apache Kafka"
---

## What You'll Learn

- Synchronous vs asynchronous communication between system components
- What Apache Kafka is and the problems it solves
- Core Kafka concepts: topics, partitions, offsets, consumer groups, brokers
- How to set up Kafka locally with Docker
- How to configure Spring Boot to work with Kafka
- How to create Kafka producers that send messages
- How to create Kafka consumers that receive messages
- Serialization and deserialization of JSON messages
- Error handling with Dead Letter Queues
- Delivery semantics (at-least-once, at-most-once, exactly-once)
- How to make consumers idempotent
- How Kafka fits into the Order Management System

## Prerequisites

- [Module 00: Java for Experienced Developers](../00-java-foundations/) — you understand Java classes, records, exceptions
- [Module 01: Build Tools & Project Setup](../01-build-tools-and-project-setup/) — you have a working Spring Boot project
- [Module 02: Dependency Injection](../02-dependency-injection/) — you understand Spring beans and constructor injection
- [Module 03: Spring Boot Fundamentals](../03-spring-boot-fundamentals/) — you understand `application.yml` configuration
- [Module 05: Service-Oriented Architecture](../05-service-oriented-architecture/) — you understand the service layer and application events

---

## 1. Synchronous vs Asynchronous Communication

When two parts of a system need to communicate, there are two fundamental approaches:

### Synchronous Communication

The caller sends a request and **waits** for a response before continuing. Like making a phone call — you wait on the line until the other person responds.

```
Order Service ──"create order"──> Payment Service
                <──"confirmed"──
                (waiting...)
```

**Pros:** Simple to understand. You get an immediate result.

**Cons:** If the payment service is slow or down, the order service is stuck waiting. The services are **tightly coupled** — a failure in one cascades to the other.

### Asynchronous Communication

The sender publishes a message and **continues immediately** without waiting for a response. Like sending an email — you send it and move on with your day.

```
Order Service ──"order created"──> [Message Broker] ──> Payment Service
                                       │
                                       └──> Notification Service
                                       │
                                       └──> Analytics Service
```

**Pros:** The sender doesn't wait. The receiver processes at its own pace. Multiple receivers can react to the same event. Services are **loosely coupled**.

**Cons:** More complex. You need a message broker. eventual consistency (things happen eventually, not immediately). Harder to debug.

### When to Use Which?

| Scenario | Use |
|----------|-----|
| Need an immediate answer (e.g., "does this customer exist?") | Synchronous |
| Need to notify multiple systems something happened | Asynchronous |
| The receiver might be slow or temporarily down | Asynchronous |
| The caller needs the result to proceed | Synchronous |
| Triggering background work (emails, analytics, shipping) | Asynchronous |

**Apache Kafka** is the most popular tool for asynchronous, event-driven communication in modern backend systems.

---

## 2. What Is Apache Kafka?

**Apache Kafka** is a distributed event streaming platform. Think of it as a post office for your applications:

- Applications (producers) drop off messages (letters) at the post office (Kafka)
- The post office stores and organizes messages by category (topics)
- Other applications (consumers) pick up messages they're interested in

Kafka was originally developed at LinkedIn to handle massive amounts of event data. It is designed to be:

- **Fast** — can handle millions of messages per second
- **Durable** — messages are stored on disk, surviving crashes
- **Scalable** — can run as a cluster of servers
- **Reliable** — messages can be replicated across multiple servers

### Kafka Analogy: A Newsstand

Imagine a newsstand:

1. Publishers (producers) deliver newspapers to the newsstand
2. The newsstand organizes newspapers into sections: Sports, Politics, Tech (topics)
3. Each section has a shelf with spots labeled 1, 2, 3, ... (partitions and offsets)
4. Subscribers (consumers) come to the newsstand and read the sections they're interested in
5. Each subscriber remembers where they stopped reading (offset) so they don't miss anything

---

## 3. Core Kafka Concepts

### Topic

A **topic** is a category or feed to which messages are published. Topics are like folders for your messages.

```
Topic: order-events
├── Partition 0: [msg1, msg2, msg3, msg4, msg5]
├── Partition 1: [msg1, msg2, msg3]
└── Partition 2: [msg1, msg2, msg3, msg4, msg5, msg6, msg7]
```

### Partition

Each topic is split into one or more **partitions**. A partition is an ordered, append-only log of messages. Partitions allow Kafka to scale — multiple partitions can be distributed across multiple servers.

```
Topic: order-events (3 partitions)

Partition 0:  [OrderCreated] [OrderConfirmed] [OrderShipped]
Partition 1:  [OrderCreated] [OrderCancelled]
Partition 2:  [OrderCreated] [OrderConfirmed] [OrderShipped] [OrderDelivered]
```

Messages within a single partition are **ordered** — you read them in the order they were written. But across partitions, there is no guaranteed order.

### Offset

An **offset** is a sequential number that identifies each message within a partition. It's like a page number in a book.

```
Partition 0:  [msg at offset 0] [msg at offset 1] [msg at offset 2] [msg at offset 3]
```

Consumers track their offset — they remember "I've read up to offset 5" so they know where to resume.

### Consumer Group

A **consumer group** is a set of consumers that work together to read messages from a topic. Each partition is assigned to exactly one consumer within a group.

```
Topic: order-events (3 partitions)

Consumer Group "notification-service":
  Consumer 1 → reads Partition 0
  Consumer 2 → reads Partition 1
  Consumer 3 → reads Partition 2

Consumer Group "analytics-service":
  Consumer 1 → reads Partition 0, 1, 2 (single consumer reads all)
```

This is how Kafka scales: add more consumers to a group, and they share the load automatically.

### Broker

A **broker** is a Kafka server. A Kafka cluster consists of one or more brokers. For development, one broker is enough. In production, you typically run 3 or more brokers for reliability.

```
Kafka Cluster:
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Broker 1 │  │ Broker 2 │  │ Broker 3 │
│(leader)  │  │(follower)│  │(follower)│
└──────────┘  └──────────┘  └──────────┘
```

### Producer

A **producer** is an application that sends messages to Kafka topics. In our system, the `OrderService` will be a producer — when an order is created, it sends an `OrderCreatedEvent` message to Kafka.

### Consumer

A **consumer** is an application that reads messages from Kafka topics. In our system, we'll create an `OrderEventConsumer` that reads order events and simulates sending confirmation emails.

### Architecture Diagram

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

---

## 4. Setting Up Kafka Locally with Docker

To run Kafka on your machine, we use **Docker Compose** — a tool that defines and runs multi-container Docker applications. You learned about Docker in Module 01.

Modern Kafka (KRaft mode, no Zookeeper) can run with a simple `docker-compose.yml`:

```yaml
## docker-compose.yml
services:
  kafka:
    image: apache/kafka:3.7.1
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENERS: PLAINTEXT://0.0.0.0:9093
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
```

To start Kafka:

```bash
docker-compose up -d
```

To stop Kafka:

```bash
docker-compose down
```

To verify Kafka is running:

```bash
docker logs kafka
```

You should see a startup log ending with something like "Kafka Server started".

---

## 5. Spring Boot Kafka Configuration

### Adding the Kafka Dependency

Add the Spring Boot Kafka starter to your `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

Spring Boot's dependency management will automatically pick the right version.

### application.yml Configuration

```yaml
spring:
  kafka:
##    # Address of the Kafka broker
    bootstrap-servers: localhost:9092
    
##    # Producer configuration
    producer:
##      # Serialize Java objects to JSON strings before sending
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      
##      # Retry sending failed messages up to 3 times
      retries: 3
      
##      # Wait 1 second between retries
      properties:
        retry.backoff.ms: 1000
    
##    # Consumer configuration
    consumer:
##      # Deserialize JSON strings back to Java objects
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      
##      # Group ID for this consumer
      group-id: ordermgmt-group
      
##      # Read from the beginning of the topic if no offset is stored
      auto-offset-reset: earliest
      
##      # Trust the packages we deserialize from
      properties:
        spring.json.trusted.packages: "com.example.ordermgmt.kafka.event"
```

### What Are Serializers and Deserializers?

When you send a Java object to Kafka, it needs to be converted to bytes (because Kafka stores bytes, not Java objects). This is called **serialization**. When reading a message from Kafka, it needs to be converted from bytes back to a Java object — this is called **deserialization**.

| Direction | Component | Role |
|-----------|-----------|------|
| Sending (producer) | Serializer | Converts Java object → JSON bytes |
| Receiving (consumer) | Deserializer | Converts JSON bytes → Java object |

We use `JsonSerializer` and `JsonDeserializer` because JSON is human-readable and works well with Java records.

---

## 6. Defining Kafka Events

First, let's define the event messages that will be sent through Kafka. These are simple records (learned in Module 00):

```java
package com.example.ordermgmt.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;

// Sent when a new order is created
public record OrderCreatedEvent(
        Long orderId,
        Long customerId,
        String customerName,
        BigDecimal totalAmount,
        Instant createdAt
) {}
```

```java
package com.example.ordermgmt.kafka.event;

import com.example.ordermgmt.domain.OrderStatus;
import java.time.Instant;

// Sent when an order's status changes
public record OrderStatusChangedEvent(
        Long orderId,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        Instant changedAt
) {}
```

---

## 7. Kafka Producers in Spring Boot

A **producer** sends messages to Kafka. In Spring Boot, you use the `KafkaTemplate` class, which Spring auto-configures for you.

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import com.example.ordermgmt.domain.OrderStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class OrderEventProducer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    // The topic name — a constant so we don't mistype it
    public static final String ORDER_EVENTS_TOPIC = "order-events";

    // Constructor injection — Spring provides KafkaTemplate automatically
    public OrderEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        // Send the event to the "order-events" topic
        // The key is the orderId as a String — this ensures all events
        // for the same order go to the same partition (preserving order)
        String key = String.valueOf(event.orderId());

        CompletableFuture<SendResult<String, Object>> future =
                kafkaTemplate.send(ORDER_EVENTS_TOPIC, key, event);

        // Handle the result asynchronously
        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.info("kafka_sent topic={} key={} orderId={} partition={} offset={}",
                        ORDER_EVENTS_TOPIC,
                        key,
                        event.orderId(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            } else {
                log.error("kafka_send_failed topic={} key={} orderId={}",
                        ORDER_EVENTS_TOPIC, key, event.orderId(), ex);
            }
        });
    }

    public void publishOrderStatusChanged(Long orderId, OrderStatus oldStatus, OrderStatus newStatus) {
        OrderStatusChangedEvent event = new OrderStatusChangedEvent(
                orderId, oldStatus, newStatus, java.time.Instant.now());

        String key = String.valueOf(orderId);

        kafkaTemplate.send(ORDER_EVENTS_TOPIC, key, event)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("kafka_status_changed orderId={} old={} new={}",
                                orderId, oldStatus, newStatus);
                    } else {
                        log.error("kafka_status_change_failed orderId={}", orderId, ex);
                    }
                });
    }
}
```

### What's Happening Here?

1. `KafkaTemplate<String, Object>` — the `String` is the key type, `Object` is the value type (we send different event types to the same topic)
2. `kafkaTemplate.send(topic, key, value)` — sends a message, returns a `CompletableFuture` (an async result)
3. The **key** is the `orderId` — Kafka uses the key to decide which partition to send the message to. Using the order ID as the key means all events for the same order go to the same partition, preserving their order
4. `whenComplete(...)` — handles success and failure. On success, logs the partition and offset. On failure, logs the error

### Why Use a Key?

If you send messages without a key, Kafka distributes them round-robin across partitions. This is fine for independent messages. But for related events (e.g., "order created" then "order confirmed" for the same order), you want them in the same partition to guarantee ordering. Using the order ID as the key ensures this — Kafka hashes the key to determine the partition, and the same key always goes to the same partition.

---

## 8. Integrating the Producer with the Service

Now let's update `OrderService` to publish events when orders change:

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.kafka.OrderEventProducer;
import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
// ... other imports

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final OrderEventProducer eventProducer;

    public OrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            OrderEventProducer eventProducer) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.eventProducer = eventProducer;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // ... order creation logic (from Module 05) ...

        OrderEntity savedOrder = orderRepository.save(order);

        // Publish event to Kafka — fire and forget
        eventProducer.publishOrderCreated(new OrderCreatedEvent(
                savedOrder.getId(),
                savedOrder.getCustomer().getId(),
                savedOrder.getCustomer().getName(),
                savedOrder.getTotalAmount(),
                savedOrder.getCreatedAt()
        ));

        return OrderResponse.from(savedOrder);
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CONFIRMED);
        OrderEntity saved = orderRepository.save(order);

        // Publish status change event
        eventProducer.publishOrderStatusChanged(orderId, oldStatus, OrderStatus.CONFIRMED);

        return OrderResponse.from(saved);
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId) {
        // ... cancel logic ...

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        OrderEntity saved = orderRepository.save(order);

        // Publish status change event
        eventProducer.publishOrderStatusChanged(orderId, oldStatus, OrderStatus.CANCELLED);

        return OrderResponse.from(saved);
    }
}
```

The service publishes events **after** the database transaction commits. The Kafka message includes the data that other services need, so they don't have to query the database again.

---

## 9. Kafka Consumers in Spring Boot

A **consumer** reads messages from Kafka. In Spring Boot, you use the `@KafkaListener` annotation on a method:

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import com.example.ordermgmt.domain.OrderStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    @KafkaListener(
            topics = "order-events",
            groupId = "ordermgmt-notification-group"
    )
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("kafka_received_order_created orderId={} customerId={} total={}",
                event.orderId(), event.customerId(), event.totalAmount());

        // In a real app, you would:
        // - Send a confirmation email to the customer
        // - Trigger inventory updates
        // - Update analytics dashboards
        // For now, we just log it
        log.info("notification_sent: Order {} created for customer {} with total {}",
                event.orderId(), event.customerName(), event.totalAmount());
    }

    @KafkaListener(
            topics = "order-events",
            groupId = "ordermgmt-notification-group"
    )
    public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
        log.info("kafka_received_status_changed orderId={} {} -> {}",
                event.orderId(), event.oldStatus(), event.newStatus());

        // In a real app, you would send notifications based on the new status:
        // - CONFIRMED: "Your order has been confirmed!"
        // - SHIPPED: "Your order has been shipped!"
        // - DELIVERED: "Your order has been delivered!"
        // - CANCELLED: "Your order has been cancelled."
        log.info("notification_sent: Order {} status changed from {} to {}",
                event.orderId(), event.oldStatus(), event.newStatus());
    }
}
```

### What's Happening Here?

1. `@KafkaListener(topics = "order-events", groupId = "...")` — tells Spring to listen to the `order-events` topic as part of a consumer group
2. The **method parameter type** (`OrderCreatedEvent`, `OrderStatusChangedEvent`) tells Spring which deserialized type to expect. Spring's `JsonDeserializer` reads a `__TypeId__` header that the `JsonSerializer` adds, and uses it to determine which Java type to deserialize to
3. Spring automatically calls this method whenever a new message arrives — you don't need to poll manually

### Multiple Consumers (Different Consumer Groups)

If you want both a notification service and an analytics service to process order events independently, create listeners with different group IDs:

```java
@Component
public class AnalyticsConsumer {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsConsumer.class);

    @KafkaListener(
            topics = "order-events",
            groupId = "analytics-group"
    )
    public void handleEvent(OrderCreatedEvent event) {
        log.info("analytics_recorded orderId={} total={}",
                event.orderId(), event.totalAmount());
        // Update analytics dashboards, revenue calculations, etc.
    }
}
```

Because this consumer has a different `groupId` ("analytics-group"), Kafka delivers **every** message to it independently of the notification consumer. Each consumer group maintains its own offset.

---

## 10. Serialization and Deserialization in Detail

The `JsonSerializer` (producer side) and `JsonDeserializer` (consumer side) handle converting between Java objects and JSON. Here's how it works:

```
Producer Side:
┌──────────────┐    ┌────────────────┐    ┌────────────────┐
│ Java Object  │───>│  JsonSerializer │───>│   JSON bytes   │──> Kafka
│ (OrderCreated│    │ (converts to   │    │ (stored on disk│
│  Event)      │    │  JSON + adds   │    │  in the topic)  │
└──────────────┘    │  __TypeId__    │    └────────────────┘
                    │  header)       │
                    └────────────────┘

Consumer Side:
                   ┌────────────────┐    ┌──────────────────┐
Kafka ──> JSON bytes──>│ JsonDeserializer│───>│  Java Object     │
                   │ (reads         │    │ (OrderCreatedEvent│
                   │  __TypeId__     │    │  with fields set) │
                   │  header to know │    └──────────────────┘
                   │  which class to │
                   │  deserialize to)│
                   └────────────────┘
```

The `__TypeId__` header is how Spring knows what Java type to deserialize each message to. When the producer sends an `OrderCreatedEvent`, the serializer adds a header saying "this is `com.example.ordermgmt.kafka.event.OrderCreatedEvent`". The consumer's deserializer reads this header and instantiates the right class.

That's why we configured `spring.json.trusted.packages` in `application.yml` — it's a security measure to prevent deserializing classes from untrusted packages.

---

## 11. Error Handling

What happens when a consumer fails to process a message? The message isn't lost — Kafka keeps it. But the consumer will keep trying and failing, creating an infinite loop. This is called a **poison pill**.

### Dead Letter Queue (DLQ)

A **Dead Letter Queue** is a special topic where failed messages are sent after exhausting retries. The main processing continues with the next message, and the failed messages can be inspected and reprocessed later.

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    // @RetryableTopic automatically creates a DLQ and retries failed messages
    @RetryableTopic(
            attempts = "3",                                    // Try 3 times
            backoff = @Backoff(delay = 1000, multiplier = 2), // Wait 1s, 2s between retries
            dltTopic = "order-events-dlt",                     // Dead letter topic name
            topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE
    )
    @KafkaListener(
            topics = "order-events",
            groupId = "ordermgmt-notification-group"
    )
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("processing orderId={}", event.orderId());

        // Simulate processing that might fail
        if (event.customerName() == null || event.customerName().isBlank()) {
            throw new RuntimeException("Cannot process order: customer name is blank");
        }

        log.info("processed orderId={}", event.orderId());
    }

    // Handle messages that exhausted all retries
    @KafkaListener(topics = "order-events-dlt", groupId = "ordermgmt-dlt-group")
    public void handleDlt(OrderCreatedEvent failedEvent) {
        log.error("dlq_received orderId={} — message failed after 3 retries",
                failedEvent.orderId());

        // In a real app, you would:
        // - Store the failed message in a database for investigation
        // - Send an alert to the operations team
        // - Fix the data and re-publish the message
    }
}
```

### How It Works

1. A message arrives at the `order-events` topic
2. The consumer tries to process it — if it throws an exception, the `@RetryableTopic` annotation catches it
3. After the first failure, the message is moved to a retry topic (e.g., `order-events-retry-0`) with a delay
4. After 3 failed attempts, the message is sent to `order-events-dlt` (the dead letter topic)
5. The `handleDlt` method receives messages that exhausted all retries for manual investigation

---

## 12. Delivery Semantics

Kafka offers three delivery guarantees. Understanding them helps you design reliable consumers.

### At-Most-Once

Messages might be lost but never duplicated. The consumer reads a message and commits the offset **before** processing it. If the consumer crashes during processing, the message is lost.

```
[read msg] → [commit offset] → [process] → [CRASH!]
                                        message is lost
```

**Use when:** losing occasional messages is acceptable (e.g., non-critical analytics).

### At-Least-Once (Default)

Messages are never lost but might be duplicated. The consumer reads a message, processes it, and **then** commits the offset. If the consumer crashes after processing but before committing, it will re-read the message.

```
[read msg] → [process] → [CRASH before commit!]
                         message will be re-delivered on restart
```

**Use when:** you can't lose messages and you can handle duplicates (most common case).

**This is the default in Spring Boot Kafka.**

### Exactly-Once

Messages are neither lost nor duplicated. This requires Kafka transactions, which add complexity and reduce throughput. Spring Boot supports this through `KafkaTemplate.executeInTransaction()` and transactional consumers.

**Use when:** duplicates would cause serious problems (e.g., financial transactions where a duplicate means double-charging).

---

## 13. Idempotent Consumers

Since the default delivery semantic is **at-least-once**, your consumers will occasionally receive the same message twice. Because of this, your consumers must be **idempotent** — processing the same message multiple times must have the same effect as processing it once.

### What Is Idempotency?

An operation is idempotent if doing it once has the same result as doing it many times:

| Operation | Idempotent? | Why |
|-----------|-------------|-----|
| Add $10 to balance with `balance += 10` | No | Each call adds another $10 |
| Set status to "confirmed" with `status = CONFIRMED` | Yes | Setting it multiple times gives the same result |
| Create order if it doesn't already exist (check by ID) | Yes | Second call finds it already exists and does nothing |

### Making Consumers Idempotent

```java
@Component
public class OrderEventConsumer {

    private final OrderRepository orderRepository;

    public OrderEventConsumer(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @KafkaListener(topics = "order-events", groupId = "ordermgmt-group")
    @Transactional
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Check if we already processed this message
        // This makes the consumer idempotent — if the message is redelivered,
        // we skip it instead of creating a duplicate order
        if (orderRepository.existsById(event.orderId())) {
            log.info("skipping_duplicate orderId={} — already processed", event.orderId());
            return;
        }

        // Process the message
        log.info("processing orderId={}", event.orderId());
        // ... create the order or perform the work ...
    }
}
```

The key idea: **check if the work was already done before doing it.** This requires a way to identify whether a message was processed — typically using a unique ID (like the order ID) and a database check.

---

## 14. Kafka Streams Overview

**Kafka Streams** is a library for building real-time stream processing applications on top of Kafka. It lets you transform, filter, aggregate, and join data streams.

Common use cases:
- Counting orders per hour in real-time
- Detecting fraudulent patterns (multiple orders from different countries within minutes)
- Joining order events with payment events to track fulfillment

We won't dive deep into Kafka Streams in this course, but here's a taste:

```java
// High-level concept (not full implementation)
// StreamsBuilder creates a processing topology
StreamsBuilder builder = new StreamsBuilder();

// Read from the "order-events" topic as a stream
KStream<String, OrderCreatedEvent> orders = builder.stream("order-events");

// Filter: only orders above $500
KStream<String, OrderCreatedEvent> highValueOrders = orders.filter(
        (key, event) -> event.totalAmount().compareTo(BigDecimal.valueOf(500)) > 0
);

// Write filtered stream to a new topic
highValueOrders.to("high-value-orders");

// Count orders by customer
KTable<String, Long> orderCounts = orders
        .groupBy((key, event) -> String.valueOf(event.customerId()))
        .count();

// The counts are a continuously updated table
// You can query them in real-time
```

Kafka Streams is powerful for real-time analytics, but it's an advanced topic. For now, know that it exists and that it builds on the same Kafka topics you already understand.

---

## What You Learned

- **Synchronous** communication waits for a response; **asynchronous** communication fires and forgets. Kafka enables asynchronous event-driven communication
- Kafka is like a post office: producers drop off messages, consumers pick them up, organized by topics
- Core concepts: **topics** (categories), **partitions** (ordered logs), **offsets** (message positions), **consumer groups** (teams of consumers), **brokers** (servers)
- Set up Kafka locally with Docker Compose using Apache Kafka 3.7+ in KRaft mode (no Zookeeper needed)
- Spring Boot auto-configures Kafka via `spring.kafka.*` properties in `application.yml`
- Use `JsonSerializer` and `JsonDeserializer` for JSON message serialization/deserialization with type headers
- **Producers** use `KafkaTemplate.send()` — use a meaningful key (like order ID) to preserve message ordering within a partition
- **Consumers** use `@KafkaListener` — Spring automatically calls your method when new messages arrive
- Different **consumer groups** each receive all messages independently
- **Error handling** uses `@RetryableTopic` for automatic retries with exponential backoff and a Dead Letter Queue (DLQ) for messages that exhaust retries
- **Delivery semantics**: at-least-once is the default — messages might be redelivered, so consumers must be **idempotent** (processing a message twice has the same effect as once)
- **Kafka Streams** enables real-time stream processing (filtering, aggregating, joining streams)

---

