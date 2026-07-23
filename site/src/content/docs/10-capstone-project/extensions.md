---
title: "Module 10: Extensions"
description: "Extensions"
---

## 23. What You Learned

- How to combine **REST controllers**, **GraphQL resolvers**, **Kafka events**,
  and **WebFlux reactive streams** in a single Spring Boot application
- How to structure a fully layered application: domain entities, repositories,
  services, DTOs, controllers, GraphQL resolvers, and Kafka producer/consumer
- How to use **records** for DTOs and events, and **explicit classes** for JPA entities
- How to write **unit tests** (Mockito), **controller tests** (MockMvc),
  **repository tests** (Testcontainers), and **reactive tests** (StepVerifier)
- How to handle **stock validation**, **transactions**, **exception mapping**,
  and **Kafka event publishing with async callbacks**
- How to expose a **reactive Flux** for real-time status updates using `Sinks.Many`

## 24. Extension Ideas (for future modules)

- **Security** — Add Spring Security with JWT authentication, role-based access,
  and audit logging.
- **Micro-services** — Split the domain into separate services (Customer, Product,
  Order) communicating via REST or gRPC.
- **Caching** — Introduce Caffeine or Redis for product look-ups and order status queries.
- **Analytics** — Stream order events to Apache Flink or ksqlDB for real-time dashboards.
- **UI** — Build a React or Thymeleaf front-end that consumes the GraphQL API and
  subscribes to real-time status changes.
- **Deployment** — Containerize the whole stack with Helm charts for Kubernetes.
- **CI/CD** — Add GitHub Actions that runs tests, builds Docker images, and pushes
  to a registry.

---

## --- Create a customer ---
curl -X POST http://localhost:8080/api/customers \
     -H "Content-Type: application/json" \
     -d '{"name":"Alice","email":"alice@example.com","address":"123 Main St"}'

## --- Create a product ---
curl -X POST http://localhost:8080/api/products \
     -H "Content-Type: application/json" \
     -d '{"name":"Coffee Mug","price":"12.99","stock":100,"category":"Kitchen"}'

## --- Create an order ---
curl -X POST http://localhost:8080/api/orders \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": 1,
       "items": [
         {"productId": 1, "quantity": 2},
         {"productId": 2, "quantity": 1}
       ]
     }'

## --- List all orders ---
curl http://localhost:8080/api/orders

## --- Update order status ---
curl -X PUT http://localhost:8080/api/orders/1/status \
     -H "Content-Type: application/json" \
     -d '{"status":"CONFIRMED"}'
```

---

## 27. Example GraphQL Queries

**Query all orders**
```graphql
query GetAllOrders {
  orders {
    id
    customerName
    status
    totalAmount
    items {
      productName
      quantity
      unitPrice
    }
  }
}
```

**Query orders by status**
```graphql
query GetPendingOrders {
  ordersByStatus(status: PENDING) {
    id
    customerName
    totalAmount
  }
}
```

**Create an order (mutation)**
```graphql
mutation CreateOrder {
  createOrder(input: {
    customerId: 1,
    items: [
      {productId: 1, quantity: 2},
      {productId: 2, quantity: 1}
    ]
  }) {
    id
    status
    totalAmount
  }
}
```

**Update order status**
```graphql
mutation UpdateStatus {
  updateOrderStatus(orderId: 1, status: CONFIRMED) {
    id
    status
  }
}
```

---

## 28. API Versioning Strategy

API versioning lets you evolve your API without breaking existing clients.

### URL-Based Versioning

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderControllerV1 {
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseV1> findById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findByIdV1(id));
    }
}

@RestController
@RequestMapping("/api/v2/orders")
public class OrderControllerV2 {
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponseV2> findById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findByIdV2(id));
    }
}
```

```bash

## V1 client
curl http://localhost:8080/api/v1/orders/1

## V2 client (new fields, different shape)
curl http://localhost:8080/api/v2/orders/1
```

### Header-Based Versioning

```java
@GetMapping(value = "/api/orders/{id}", headers = "X-API-Version=1")
public ResponseEntity<OrderResponseV1> findByIdV1(@PathVariable Long id) { ... }

@GetMapping(value = "/api/orders/{id}", headers = "X-API-Version=2")
public ResponseEntity<OrderResponseV2> findByIdV2(@PathVariable Long id) { ... }
```

```bash
curl -H "X-API-Version: 2" http://localhost:8080/api/orders/1
```

### Content Negotiation Versioning

```java
@GetMapping(value = "/api/orders/{id}", produces = "application/vnd.ordermgmt.v1+json")
public ResponseEntity<OrderResponseV1> findByIdV1(@PathVariable Long id) { ... }

@GetMapping(value = "/api/orders/{id}", produces = "application/vnd.ordermgmt.v2+json")
public ResponseEntity<OrderResponseV2> findByIdV2(@PathVariable Long id) { ... }
```

```bash
curl -H "Accept: application/vnd.ordermgmt.v2+json" http://localhost:8080/api/orders/1
```

### Comparison

| Approach | Pros | Cons |
|----------|------|------|
| URL path (`/v1/`) | Simple, cacheable, visible | URL changes with versions |
| Header (`X-API-Version`) | URL stays clean | Not visible in URL, harder to debug |
| Content negotiation | RESTful, uses standard headers | Complex Accept header |

---

## Stage 1: Build
FROM maven:3-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline  # cache dependencies
COPY src ./src
RUN mvn clean package -DskipTests

## Stage 2: Runtime (small image)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

## Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/target/ordermgmt-1.0.0.jar app.jar

## JVM container-aware settings
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"'

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### Key Production Practices

| Practice | Why |
|----------|-----|
| Multi-stage build | Final image only contains the JRE + JAR (~200MB vs ~800MB) |
| Non-root user | Prevents privilege escalation if container is compromised |
| `MaxRAMPercentage` | JVM auto-tunes heap to container memory limits |
| Health check | Orchestrator (Kubernetes) knows when app is ready |
| Layer caching | `pom.xml` copied before `src/` — dependency download cached |
| Alpine base | Smaller attack surface, fewer vulnerabilities |

---

## Add dependency: net.logstash.logback:logstash-logback-encoder
```

```xml
<!-- logback-spring.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <customFields>{"service":"ordermgmt","version":"1.0.0"}</customFields>
        </encoder>
    </appender>
    <root level="INFO">
        <appender-ref ref="JSON"/>
    </root>
</configuration>
```

Output:
```json
{"@timestamp":"2025-01-15T10:30:00Z","level":"INFO","logger":"c.e.o.service.OrderService","message":"Creating order","service":"ordermgmt","version":"1.0.0"}
```

### Micrometer Metrics

Spring Boot Actuator + Micrometer exposes metrics at `/actuator/metrics`:

```java
@Service
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final Counter ordersCreated;
    private final Timer orderProcessingTime;

    public OrderService(OrderRepository repo, MeterRegistry meterRegistry) {
        this.repo = repo;
        this.meterRegistry = meterRegistry;
        this.ordersCreated = meterRegistry.counter("orders.created.total");
        this.orderProcessingTime = meterRegistry.timer("orders.processing.time");
    }

    public OrderResponse createOrder(CreateOrderRequest request) {
        return orderProcessingTime.record(() -> {
            ordersCreated.increment();
            // ... business logic
        });
    }
}
```

### Custom Health Indicator

```java
@Component
public class KafkaHealthIndicator implements HealthIndicator {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public KafkaHealthIndicator(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public Health health() {
        try {
            kafkaTemplate.getDefaultTopic();  // check connectivity
            return Health.up()
                    .withDetail("broker", "connected")
                    .build();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
```

Access at: `GET /actuator/health` → includes `kafka` health indicator.

---

## 31. Sealed Classes for Domain Modeling

Java 21 sealed classes let us model the domain exhaustively — the compiler guarantees we handle every case. We'll refactor `OrderStatus` and event types to use sealed interfaces.

### Sealed Order Events

```java
package com.example.ordermgmt.kafka.event;

// Sealed interface: only these permitted types are valid order events
public sealed interface OrderEvent
        permits OrderCreatedEvent, OrderStatusChangedEvent, OrderCancelledEvent {

    Long orderId();
    Instant timestamp();
}

public record OrderCreatedEvent(
        Long orderId,
        Long customerId,
        BigDecimal totalAmount,
        Instant timestamp
) implements OrderEvent {}

public record OrderStatusChangedEvent(
        Long orderId,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        Instant timestamp
) implements OrderEvent {}

public record OrderCancelledEvent(
        Long orderId,
        String reason,
        Instant timestamp
) implements OrderEvent {}
```

### Pattern Matching on Sealed Events

The Kafka consumer can now use pattern matching switch — the compiler enforces exhaustiveness:

```java
@KafkaListener(topics = "order-events", groupId = "ordermgmt-group")
public void handleEvent(OrderEvent event) {
    switch (event) {
        case OrderCreatedEvent e -> {
            log.info("Order created: orderId={}, total={}", e.orderId(), e.totalAmount());
            notificationService.sendOrderConfirmation(e);
        }
        case OrderStatusChangedEvent e -> {
            log.info("Status changed: orderId={} {}→{}", e.orderId(), e.oldStatus(), e.newStatus());
            analyticsService.recordStatusChange(e);
        }
        case OrderCancelledEvent e -> {
            log.info("Order cancelled: orderId={}, reason={}", e.orderId(), e.reason());
            notificationService.sendCancellationNotice(e);
        }
        // No default needed — the compiler knows all permitted subtypes
    }
}
```

If someone later adds `OrderRefundedEvent implements OrderEvent`, the switch fails to compile until the new case is handled. This is **exhaustive domain modeling** — the compiler catches missing cases.

### Deep Dive: Sealed Classes vs Enums

Sealed interfaces are more powerful than enums:

- **Enums** are singletons — one instance per value. You can't attach per-instance data.
- **Sealed classes/interfaces** allow per-instance fields. `OrderCreatedEvent` carries `totalAmount`, `OrderCancelledEvent` carries `reason` — different data per variant.
- **Records + sealed = algebraic data types** — the functional programming concept where types are composed of "or" (sealed) and "and" (records) relationships.

Use enums when all variants share the same shape. Use sealed when variants have different fields.

---

## 32. Virtual Threads for Blocking Endpoints

Java 21's **virtual threads** (Project Loom) give us a third concurrency model alongside Spring MVC (thread-per-request) and Spring WebFlux (reactive). Virtual threads allow blocking code to scale without the cognitive overhead of reactive pipelines.

### When to Use Virtual Threads vs Reactive

| Scenario | Recommended Approach | Why |
|----------|----------------------|-----|
| Simple CRUD REST endpoint | Virtual threads | Blocking code is simpler to read and debug |
| Streaming data to client (SSE/WebSocket) | WebFlux (Flux) | Reactive streams handle streaming naturally |
| Kafka consumer with complex processing | Either | Virtual threads for blocking DB calls, reactive for backpressure |
| Aggregating multiple async data sources | Reactive (Flux.merge/zip) | Composing async streams is reactive's strength |
| Legacy library that blocks (JDBC driver) | Virtual threads | Cannot make blocking code reactive without wrapping |

### Enabling Virtual Threads

In `application.yml`:

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

Spring Boot 3.2+ automatically uses virtual threads for HTTP request handling when this flag is set. Tomcat creates virtual threads instead of platform threads — each request gets a virtual thread that costs ~a few KB instead of ~1MB.

### Mixing Virtual Threads and Reactive

You can have both in the same application:

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.service.OrderService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // This endpoint runs on a virtual thread (blocking, but scales)
    @GetMapping
    public List<OrderResponse> listOrders() {
        return orderService.getAllOrders(); // blocks on JPA, but on a virtual thread
    }

    // The reactive endpoint in OrderFluxController handles streaming
    // on Netty event loop (non-blocking Flux)
}
```

This is the practical answer to "should I use virtual threads or reactive?": **use both, each where it fits.**

### Configuring Tomcat + Virtual Threads

For the blocking REST endpoints, we configure Tomcat to use virtual threads:

```java
package com.example.ordermgmt.config;

import org.springframework.boot.web.embedded.tomcat.TomcatProtocolHandlerCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executors;

@Configuration
public class VirtualThreadConfig {

    @Bean
    public TomcatProtocolHandlerCustomizer<?> protocolHandlerVirtualThreadExecutorCustomizer() {
        return protocolHandler -> {
            protocolHandler.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        };
    }
}
```

Now every HTTP request to `/api/orders/*` runs on a virtual thread. You can block freely (JPA calls, REST client calls) without worrying about thread exhaustion.

### Deep Dive: Virtual Thread Pitfalls

Virtual threads are cheap, but they're not free. Watch out for:

- **Synchronized blocks**: Virtual threads pinned to their carrier thread inside `synchronized`. Use `ReentrantLock` instead if a virtual thread might block inside a lock.
- **Thread-local overuse**: Virtual threads support `ThreadLocal`, but millions of virtual threads with thread-locals consume real memory. Prefer passing context explicitly.
- **`Object.wait()`**: Also pins the virtual thread. Use `java.util.concurrent` locks instead.

```java
// BAD: pins the virtual thread
synchronized (lock) {
    condition.await(); // pins!
}

// GOOD: does not pin
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    condition.await(); // does NOT pin
} finally {
    lock.unlock();
}
```

---

## 33. Preparing for Kotlin Migration (Module 11 Preview)

The capstone is written in Java, but the codebase is structured to make a future Kotlin migration (covered in Module 11) straightforward. Here's what makes the code Kotlin-ready:

### Patterns That Migrate Cleanly

| Java Pattern (This Module) | Kotlin Equivalent (Module 11) | Why It Migrates Cleanly |
|----------------------------|-------------------------------|------------------------|
| Records (`record OrderResponse(...)`) | `data class OrderResponse(...)` | Same concept, one-line conversion |
| Constructor injection | Constructor injection | Identical — Kotlin supports it natively |
| Sealed interfaces | `sealed interface` / `sealed class` | Kotlin had sealed classes before Java |
| `var` local variables | `val` / `var` | Kotlin's version is more expressive (val = immutable) |
| Pattern matching switch | `when` expression | Kotlin's `when` is more flexible |
| `Optional<T>` | Nullable `T?` | Kotlin's null safety replaces Optional |

### Records Are Already Kotlin-Friendly

Our DTOs are records — when migrated to Kotlin, they become `data class` with one line change:

```java
// Java (current)
public record OrderResponse(
        Long id,
        Long customerId,
        String customerName,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt
) {}
```

```kotlin
// Kotlin (after migration — Module 11)
data class OrderResponse(
    val id: Long?,
    val customerId: Long,
    val customerName: String,
    val status: OrderStatus,
    val totalAmount: BigDecimal,
    val createdAt: Instant
)
```

### Sealed Events Map Directly to Kotlin

Our sealed `OrderEvent` interface (section 27 above) becomes even more natural in Kotlin:

```kotlin
sealed interface OrderEvent {
    val orderId: Long
    val timestamp: Instant
}

data class OrderCreatedEvent(
    override val orderId: Long,
    val customerId: Long,
    val totalAmount: BigDecimal,
    override val timestamp: Instant
) : OrderEvent

// Exhaustive when:
fun handleEvent(event: OrderEvent) = when (event) {
    is OrderCreatedEvent -> println("Created: ${event.orderId}")
    is OrderStatusChangedEvent -> println("Changed: ${event.orderId}")
    is OrderCancelledEvent -> println("Cancelled: ${event.orderId}")
    // No else needed — sealed guarantees exhaustiveness
}
```

### What to Avoid (Anti-patterns for Migration)

Patterns that make Kotlin migration harder:

- **Field injection** (`@Autowired` on fields) — Kotlin classes are final by default; field injection requires proxies. Use constructor injection (which we do throughout).
- **Lombok** — we don't use it; records replace Lombok's `@Data`/`@Builder`. Lombok has poor Kotlin interop.
- **Mutable state in services** — services are stateless with `final` fields. This maps to Kotlin `val` properties.
- **Static utility methods** — prefer instance methods or companion objects. Kotlin doesn't have `static`; it uses `companion object`.

### Migration Strategy Preview

Module 11 covers the full migration, but the high-level strategy is:

1. **Start with DTOs** — records → data classes (mechanical, safe)
2. **Then entities** — JPA entities need `no-arg` constructor plugin, but otherwise convert cleanly
3. **Then services** — constructor injection maps directly, `val` replaces `final`
4. **Then controllers** — `@RestController` + routing annotations are identical
5. **Finally, replace Reactor with coroutines** — `suspend fun` replaces `Mono<T>`/`Flux<T>`

The capstone codebase is structured so each of these steps is independent.

---

## What You Learned

- How to assemble a complete Order Management System using **all concepts from all modules**
- **Sealed interfaces** + records for exhaustive, compiler-checked domain modeling
- **Virtual threads** as a third concurrency model alongside MVC and WebFlux
- How to **mix blocking (virtual threads) and reactive (WebFlux)** in the same application
- How sealed events make **pattern matching in Kafka consumers** exhaustive and safe
- Why the codebase structure (records, constructor injection, no Lombok) **prepares for Kotlin migration**
- How Java sealed types map directly to **Kotlin sealed classes** — the migration is structural
- When to choose virtual threads vs reactive streams (use both, each where it fits)

---
