---
title: "Lesson 37: Spring Boot Kafka Producers & Consumers"
description: "Lesson 37: Spring Boot Kafka Producers & Consumers"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0037-spring-kafka-producers-consumers.html
---

# Spring Boot Kafka Producers & Consumers

Now that you understand Kafka's core concepts, it's time to write real code. This lesson covers three practical steps: spinning up Kafka locally with Docker Compose, configuring Spring Boot to connect to it, and building a producer and a consumer that exchange events.

## Docker Compose for Local Kafka

Modern Kafka (3.7+) runs in **KRaft mode**: no Zookeeper needed. A single-container `docker-compose.yml` is enough for development:

```
# docker-compose.yml
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
```

Start and stop with:

```
docker-compose up -d      # start in background
docker-compose down        # stop and remove containers
docker logs kafka          # verify startup
```

The `KAFKA_ADVERTISED_LISTENERS` line is the one that matters most: it tells clients to connect at `localhost:9092`. Wrong value here is the #1 reason Kafka connections fail from the host.

## Adding the Spring Kafka Dependency

Add the starter to `pom.xml`. Spring Boot's BOM picks the right version:

```
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

## application.yml Configuration

Spring Boot auto-configures Kafka from `spring.kafka.*` properties. Here is the minimum you need:

```
spring:
  kafka:
    bootstrap-servers: localhost:9092

    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      retries: 3
      properties:
        retry.backoff.ms: 1000

    consumer:
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      group-id: ordermgmt-group
      auto-offset-reset: earliest
      properties:
        spring.json.trusted.packages: "com.example.ordermgmt.kafka.event"
```

Key decisions explained:

| Property | Why |
| --- | --- |
| `bootstrap-servers` | Address of the Kafka broker, matches Docker's published port |
| `StringSerializer` / `StringDeserializer` for keys | Keys are simple strings (e.g., `"42"` for an order ID) |
| `JsonSerializer` / `JsonDeserializer` for values | Converts Java records ↔ JSON bytes; adds a `__TypeId__` header so the consumer knows which class to deserialize to |
| `auto-offset-reset: earliest` | If no stored offset exists (new consumer group), start reading from the beginning of the topic so you don't miss historical messages during development |
| `spring.json.trusted.packages` | Security allowlist: the deserializer refuses to instantiate classes from untrusted packages |

## Defining the Event

Events are simple records. They travel through Kafka as JSON, so include everything the consumer needs. No round-trips to query the database:

```
package com.example.ordermgmt.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderCreatedEvent(
        Long orderId,
        Long customerId,
        String customerName,
        BigDecimal totalAmount,
        Instant createdAt
) {}
```

## Creating a Producer with KafkaTemplate

Spring Boot auto-configures a `KafkaTemplate` bean from the `producer.*` properties. Inject it and call `send()`:

```
@Component
public class OrderEventProducer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public static final String ORDER_EVENTS_TOPIC = "order-events";

    public OrderEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        String key = String.valueOf(event.orderId());

        kafkaTemplate.send(ORDER_EVENTS_TOPIC, key, event)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("kafka_sent topic={} key={} partition={} offset={}",
                                ORDER_EVENTS_TOPIC, key,
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    } else {
                        log.error("kafka_send_failed topic={} key={}",
                                ORDER_EVENTS_TOPIC, key, ex);
                    }
                });
    }
}
```

Three things to notice:

1.  **The key is the order ID.** Kafka hashes the key to pick a partition. Same key → same partition → messages for the same order are always in order. Without a key, Kafka distributes round-robin and ordering is lost.
2.  **`send()` is async.** It returns a `CompletableFuture`. Use `whenComplete` to log success or failure; don't block the calling thread with `.get()`.
3.  **`KafkaTemplate<String, Object>`**: `Object` because we send different event types to the same topic. The `JsonSerializer` adds a `__TypeId__` header so the consumer knows the concrete type.

## Integrating the Producer with the Service

The service publishes events **after** the database transaction commits:

```
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderEventProducer eventProducer;

    public OrderService(OrderRepository orderRepository,
                        OrderEventProducer eventProducer) {
        this.orderRepository = orderRepository;
        this.eventProducer = eventProducer;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // ... order creation logic ...
        OrderEntity savedOrder = orderRepository.save(order);

        eventProducer.publishOrderCreated(new OrderCreatedEvent(
                savedOrder.getId(),
                savedOrder.getCustomer().getId(),
                savedOrder.getCustomer().getName(),
                savedOrder.getTotalAmount(),
                savedOrder.getCreatedAt()
        ));

        return OrderResponse.from(savedOrder);
    }
}
```

Because `send()` is fire-and-forget, the service doesn't wait for Kafka to acknowledge the message. If you need transactional consistency (database write + Kafka send as one unit), that's a separate topic covered in the next lesson.

## Creating a Consumer with @KafkaListener

Annotate a method with `@KafkaListener`, and Spring calls it automatically whenever a message arrives:

```
@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    @KafkaListener(
            topics = "order-events",
            groupId = "ordermgmt-notification-group"
    )
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("kafka_received orderId={} customer={} total={}",
                event.orderId(), event.customerName(), event.totalAmount());

        // In a real app: send email, update analytics, trigger shipping
        log.info("notification_sent: Order {} for customer {}",
                event.orderId(), event.customerName());
    }
}
```

Spring does the heavy lifting:

-   Deserializes the JSON bytes into an `OrderCreatedEvent` using the `__TypeId__` header
-   Commits the offset automatically after the method returns successfully
-   If the method throws, the offset is not committed: the message will be redelivered

## Multiple Consumer Groups

Each `groupId` is an independent subscriber. Two listeners with different group IDs each receive **every** message:

```
@Component
public class AnalyticsConsumer {

    @KafkaListener(
            topics = "order-events",
            groupId = "analytics-group"          // different group!
    )
    public void handleEvent(OrderCreatedEvent event) {
        log.info("analytics_recorded orderId={} total={}",
                event.orderId(), event.totalAmount());
    }
}
```

The notification group and the analytics group maintain **separate offsets**. If the notification consumer goes down for an hour, it resumes where it left off. The analytics consumer is unaffected.

## Consumer Group Rebalancing

When a consumer joins or leaves a group, Kafka **rebalances**: it reassigns partitions among the current members. This is automatic, but has consequences:

-   **Consumer added:** partitions are redistributed. Some messages in-flight during the swap may be redelivered (at-least-once).
-   **Consumer removed (crash):** its partitions are reassigned to surviving members. Uncommitted offsets are reprocessed.
-   **Key ordering preserved:** a given partition always goes to exactly one consumer in the group. Same key → same partition → same consumer → order maintained.

This is why your consumers **must be idempotent**: rebalancing will occasionally cause redelivery. The next lesson covers this in detail.

**Primary sources:** [Spring Kafka Reference](https://docs.spring.io/spring-kafka/reference/) · [Kafka Producer Configs](https://kafka.apache.org/documentation/#producerconfigs) · [Kafka Consumer Configs](https://kafka.apache.org/documentation/#consumerconfigs) · [Docker Compose Docs](https://docs.docker.com/compose/)

## Check your understanding

<details>
<summary>1. Your Kafka connection fails from the host, but docker logs kafka shows a healthy startup. Which misconfiguration is the most likely cause?</summary>
<p><strong>Correct answer:</strong> KAFKA_ADVERTISED_LISTENERS points to the container hostname instead of localhost</p>
</details>

<details>
<summary>2. You call kafkaTemplate.send(topic, value) without a key. What happens to message ordering?</summary>
<p><strong>Correct answer:</strong> Messages are distributed round-robin across partitions: ordering is lost</p>
</details>

<details>
<summary>3. A @KafkaListener method throws a RuntimeException. What does Spring Kafka do?</summary>
<p><strong>Correct answer:</strong> Does not commit the offset: the message will be redelivered on the next poll</p>
</details>

<details>
<summary>4. Two @KafkaListener methods listen to the same topic but use different groupId values. What does each consumer receive?</summary>
<p><strong>Correct answer:</strong> Each group independently receives every message from the topic</p>
</details>

<details>
<summary>5. A consumer group has 3 consumers reading a topic with 2 partitions. A new consumer joins the group, making it 4. What happens?</summary>
<p><strong>Correct answer:</strong> Kafka rebalances the 2 partitions among the 3 consumers that can hold one; the 4th consumer stays idle</p>
</details>
