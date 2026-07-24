---
title: "Module 10: Deployment"
description: "Deployment"
---

## 1. Step-by-Step Guide to Run the Application

1. **Create the project** (or clone the repo).

2. **Start PostgreSQL and Kafka**:

```bash
docker compose up -d
```

3. **Verify connectivity**:

```bash
docker exec -it oms-postgres psql -U postgres -c "SELECT 1;"
```

4. **Build and run the application**:

```bash
./mvnw clean package
java -jar target/ordermgmt-1.0.0.jar
```

   The REST API is at `http://localhost:8080/api/orders` and
   GraphQL at `http://localhost:8080/graphql`.
   GraphiQL UI at `http://localhost:8080/graphiql`.

5. **Run the test suite**:

```bash
./mvnw test
```

6. **Explore the API** — see the curl commands and GraphQL queries below.

---

## 2. Example Curl Commands (REST)

```bash
# --- Create a customer ---
curl -X POST http://localhost:8080/api/customers \
     -H "Content-Type: application/json" \
     -d '{"name":"Alice","email":"alice@example.com","address":"123 Main St"}'

# --- Create a product ---
curl -X POST http://localhost:8080/api/products \
     -H "Content-Type: application/json" \
     -d '{"name":"Coffee Mug","price":"12.99","stock":100,"category":"Kitchen"}'

# --- Create an order ---
curl -X POST http://localhost:8080/api/orders \
     -H "Content-Type: application/json" \
     -d '{
       "customerId": 1,
       "items": [
         {"productId": 1, "quantity": 2},
         {"productId": 2, "quantity": 1}
       ]
     }'

# --- List all orders ---
curl http://localhost:8080/api/orders

# --- Update order status ---
curl -X PUT http://localhost:8080/api/orders/1/status \
     -H "Content-Type: application/json" \
     -d '{"status":"CONFIRMED"}'
```

---

## 3. Example GraphQL Queries

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

## 4. Docker Production Best Practices

### Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM maven:3-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline  # cache dependencies
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime (small image)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/target/ordermgmt-1.0.0.jar app.jar

# JVM container-aware settings
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

## 5. Observability and Monitoring

### Structured JSON Logging

```java
// In application.yml — use Logback's JSON encoder
# Add dependency: net.logstash.logback:logstash-logback-encoder
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


## 6. Sealed Classes for Domain Modeling

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

<details>
<summary>Deep Dive: Sealed Classes vs Enums</summary>

Sealed interfaces are more powerful than enums:

- **Enums** are singletons — one instance per value. You can't attach per-instance data.
- **Sealed classes/interfaces** allow per-instance fields. `OrderCreatedEvent` carries `totalAmount`, `OrderCancelledEvent` carries `reason` — different data per variant.
- **Records + sealed = algebraic data types** — the functional programming concept where types are composed of "or" (sealed) and "and" (records) relationships.

Use enums when all variants share the same shape. Use sealed when variants have different fields.

</details>

---
