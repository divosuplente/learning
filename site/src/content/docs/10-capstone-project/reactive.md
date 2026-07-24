---
title: "Module 10: Reactive Stream"
description: "Reactive Stream"
---

## 1. Reactive Order Status Stream

This component exposes order status changes as a reactive `Flux` that clients can
subscribe to via GraphQL subscriptions or SSE endpoints. The `Sinks.Many` is a
thread-safe multicast publisher — multiple subscribers each receive every signal.

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderStatusChangedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Component
public class OrderStatusPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderStatusPublisher.class);

    private final Sinks.Many<OrderStatusChangedEvent> sink =
            Sinks.many().multicast().onBackpressureBuffer();

    public void publish(OrderStatusChangedEvent event) {
        log.info("Publishing status change to reactive stream: order {} {} -> {}",
                event.orderId(), event.oldStatus(), event.newStatus());
        sink.tryEmitNext(event);
    }

    public Flux<OrderStatusChangedEvent> subscribe() {
        return sink.asFlux();
    }
}
```

Update `OrderEventConsumer` to also push events to the reactive stream:

```java
@Component
public class OrderEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderEventConsumer.class);
    private final OrderStatusPublisher statusPublisher;

    public OrderEventConsumer(OrderStatusPublisher statusPublisher) {
        this.statusPublisher = statusPublisher;
    }

    @KafkaListener(topics = "${kafka.topic.order-created:order-created}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderCreated(ConsumerRecord<String, OrderCreatedEvent> record) {
        log.info("Received OrderCreatedEvent: orderId={}", record.value().orderId());
    }

    @KafkaListener(topics = "${kafka.topic.order-status:order-status}",
                   groupId = "${spring.kafka.consumer.group-id:ordermgmt-group}")
    public void handleOrderStatusChanged(ConsumerRecord<String, OrderStatusChangedEvent> record) {
        log.info("Received OrderStatusChangedEvent: {} -> {}",
                record.value().oldStatus(), record.value().newStatus());
        statusPublisher.publish(record.value());
    }
}
```

---
