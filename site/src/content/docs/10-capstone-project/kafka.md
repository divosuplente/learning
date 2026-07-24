---
title: "Module 10: Kafka Integration"
description: "Kafka Integration"
---

## 1. Kafka Event Records

Events are Java records — immutable message payloads.

```java
package com.example.ordermgmt.kafka.event;

import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderCreatedEvent(
        Long orderId,
        Long customerId,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt
) {
    public static OrderCreatedEvent from(OrderEntity order) {
        return new OrderCreatedEvent(
                order.getId(),
                order.getCustomer().getId(),
                order.getStatus(),
                order.getTotalAmount(),
                order.getCreatedAt()
        );
    }
}

public record OrderStatusChangedEvent(
        Long orderId,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        Instant changedAt
) {
    public static OrderStatusChangedEvent from(OrderEntity order, OrderStatus oldStatus) {
        return new OrderStatusChangedEvent(
                order.getId(),
                oldStatus,
                order.getStatus(),
                Instant.now()
        );
    }
}
```

---

## 2. Kafka Producer

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class OrderEventProducer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final String orderCreatedTopic;
    private final String orderStatusTopic;

    public OrderEventProducer(
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${kafka.topic.order-created:order-created}") String orderCreatedTopic,
            @Value("${kafka.topic.order-status:order-status}") String orderStatusTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.orderCreatedTopic = orderCreatedTopic;
        this.orderStatusTopic = orderStatusTopic;
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        CompletableFuture<SendResult<String, Object>> future =
                kafkaTemplate.send(orderCreatedTopic, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish OrderCreatedEvent for order {}", event.orderId(), ex);
            } else {
                log.info("Published OrderCreatedEvent for order {} to partition {}",
                        event.orderId(), result.getRecordMetadata().partition());
            }
        });
    }

    public void publishOrderStatusChanged(OrderStatusChangedEvent event) {
        CompletableFuture<SendResult<String, Object>> future =
                kafkaTemplate.send(orderStatusTopic, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish OrderStatusChangedEvent for order {}",
                        event.orderId(), ex);
            } else {
                log.info("Published OrderStatusChangedEvent for order {} to partition {}",
                        event.orderId(), result.getRecordMetadata().partition());
            }
        });
    }
}
```

---

## 3. Kafka Consumer

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);

    @KafkaListener(topics = "${kafka.topic.order-created:order-created}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderCreated(ConsumerRecord<String, OrderCreatedEvent> record) {
        log.info("Received OrderCreatedEvent: orderId={}, partition={}, offset={}",
                record.value().orderId(), record.partition(), record.offset());
        // In a real app: send notification email, update analytics dashboard, etc.
    }

    @KafkaListener(topics = "${kafka.topic.order-status:order-status}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderStatusChanged(ConsumerRecord<String, OrderStatusChangedEvent> record) {
        log.info("Received OrderStatusChangedEvent: orderId={}, {} -> {}",
                record.value().orderId(),
                record.value().oldStatus(),
                record.value().newStatus());
        // In a real app: push real-time update via WebSocket/SSE, trigger shipping, etc.
    }
}
```

---
