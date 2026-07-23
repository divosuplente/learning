---
title: "Module 09: Integration Testing"
description: "Integration Testing"
---

## 12. Testing Kafka Consumers

Spring Boot provides `@EmbeddedKafka` for testing Kafka without a Docker container:

### Adding Test Dependencies

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka-test</artifactId>
    <scope>test</scope>
</dependency>
```

### Kafka Consumer Test

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@EmbeddedKafka(
        partitions = 1,
        topics = {"order-events"}
)
class OrderEventConsumerTest {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private OrderEventConsumer consumer;

    @Test
    void shouldConsumeOrderCreatedEvent() throws Exception {
        // Arrange
        OrderCreatedEvent event = new OrderCreatedEvent(
                42L, 7L, "Alice", new BigDecimal("149.97"), Instant.now()
        );

        // Act
        kafkaTemplate.send("order-events", String.valueOf(42L), event);
        kafkaTemplate.flush();

        // Wait for the consumer to process
        // Use a latch or Awaitility for more robust waiting
        Thread.sleep(2000);

        // Assert — verify the consumer processed the message
        // (In a real test, you'd check a side effect like a database update
        // or use CountDownLatch for deterministic waiting)
    }
}
```

---

## 13. Testing Reactive Streams with StepVerifier

For testing Mono and Flux (from Module 08), use **StepVerifier** from the `reactor-test` library:

### Adding the Dependency

```xml
<dependency>
    <groupId>io.projectreactor</groupId>
    <artifactId>reactor-test</artifactId>
    <scope>test</scope>
</dependency>
```

### StepVerifier Example

```java
package com.example.ordermgmt.reactive;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Duration;
import java.util.List;

class ReactiveServiceTest {

    @Test
    void shouldVerifyFluxEmissions() {
        Flux<String> flux = Flux.just("PENDING", "CONFIRMED", "SHIPPED");

        StepVerifier.create(flux)
                .expectNext("PENDING")
                .expectNext("CONFIRMED")
                .expectNext("SHIPPED")
                .verifyComplete();
    }

    @Test
    void shouldVerifyErrorInFlux() {
        Flux<Integer> flux = Flux.range(1, 3)
                .map(i -> {
                    if (i == 3) {
                        throw new RuntimeException("Three is not allowed");
                    }
                    return i;
                });

        StepVerifier.create(flux)
                .expectNext(1)
                .expectNext(2)
                .expectError(RuntimeException.class)
                .verify();
    }

    @Test
    void shouldVerifyMonoWithValue() {
        Mono<String> mono = Mono.just("Hello Reactive!");

        StepVerifier.create(mono)
                .expectNext("Hello Reactive!")
                .verifyComplete();
    }

    @Test
    void shouldVerifyEmptyMono() {
        Mono<String> mono = Mono.empty();

        StepVerifier.create(mono)
                .verifyComplete();
    }
}
```

### What StepVerifier Does

StepVerifier subscribes to the reactive stream and verifies each event as it arrives:
- `expectNext(value)` — checks the next emitted item
- `expectError(Exception.class)` — checks that the stream throws an error
- `verifyComplete()` — checks that the stream completed successfully
- `verify()` — starts the verification (blocking) and checks everything asserted above

---
