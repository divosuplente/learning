---
title: "Capstone Architecture: Assembling All Technologies"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/10-capstone-project/0055-capstone-architecture.md
---

Modules 00-09 each taught one technology in isolation. A real application uses them **all at once**. This lesson shows you how REST, GraphQL, Kafka, JPA, and WebFlux coexist in a single Spring Boot application, and why layered architecture keeps the resulting codebase navigable.

## The Domain: Order Management System

The capstone is an **Order Management System (OMS)** for an e-commerce platform. It manages customers, products, and orders, each order containing multiple line items with quantity and unit price. When an order is created or its status changes, a Kafka event is published. Clients query the system via REST or GraphQL, and a reactive endpoint streams order-status updates in real time.

## Architecture Diagram

```
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│  REST Client   │   │  GraphQL       │   │  Reactive     │
│  (curl, post)  │   │  Client       │   │  Subscriber   │
└───────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                     │                     │
        │ HTTP                │ /graphql            │ SSE / WS
┌───────▼─────────────────────▼─────────────────────▼────────┐
│                    Spring Boot Application                 │
│                                                            │
│  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ OrderController│  │OrderResolver │  │OrderFlux       │ │
│  │ (REST)         │  │(GraphQL)     │  │(WebFlux)       │ │
│  └───────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
│          │                  │                   │          │
│  ┌───────▼──────────────────▼───────────────────▼────────┐│
│  │                   OrderService                         ││
│  │  (business logic, transactions, event publishing)      ││
│  └───────┬──────────────┬─────────────────────────────────┘│
│          │              │                                    │
│  ┌───────▼───────┐  ┌───▼──────────────────┐               │
│  │ Repositories   │  │ OrderEventProducer   │               │
│  │ (JPA)          │  │ (Kafka)              │               │
│  └───────┬───────┘  └───────┬──────────────┘               │
│          │                   │                               │
└──────────┼───────────────────┼───────────────────────────────┘
           │                   │
   ┌───────▼───────┐   ┌───────▼───────┐
   │  PostgreSQL   │   │    Kafka      │
   └───────────────┘   └───────┬───────┘
                               │
                       ┌───────▼───────┐
                       │OrderEvent      │
                       │Consumer         │
                       │(notifications) │
                       └───────────────┘
```

Three API styles (REST, GraphQL, and reactive streaming) all delegate to the **same service layer**. The service layer talks to JPA repositories and a Kafka producer. The database stores the source of truth; Kafka broadcasts what changed.

## Why REST and GraphQL Coexist

Spring Boot lets you run **both** a REST controller and a GraphQL resolver in the same application. They are not competing. They serve different clients:

-   **REST** for simple CRUD operations and integrations that expect standard HTTP verbs.
-   **GraphQL** for clients that need to fetch exactly the fields they want: no over-fetching, no under-fetching.
-   **WebFlux SSE** for real-time dashboards that need a live stream of status changes.

The key insight: **all three share the same `OrderService`.** Spring MVC handles REST; Spring for GraphQL handles queries and mutations; WebFlux handles the streaming endpoint. Spring Boot auto-configures all three simultaneously. There is no conflict because each framework maps to a different URL path.

## Project Structure

```
ordermgmt/
├── src/
│   ├── main/
│   │   ├── java/com/example/ordermgmt/
│   │   │   ├── OrderManagementApplication.java
│   │   │   ├── config/
│   │   │   │   └── KafkaConfig.java
│   │   │   ├── controller/
│   │   │   │   ├── OrderController.java
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   ├── domain/
│   │   │   │   ├── CustomerEntity.java
│   │   │   │   ├── ProductEntity.java
│   │   │   │   ├── OrderEntity.java
│   │   │   │   ├── OrderItemEntity.java
│   │   │   │   └── OrderStatus.java
│   │   │   ├── dto/
│   │   │   │   ├── CreateOrderRequest.java
│   │   │   │   └── OrderResponse.java
│   │   │   ├── graphql/
│   │   │   │   ├── OrderQueryResolver.java
│   │   │   │   └── OrderMutationResolver.java
│   │   │   ├── kafka/
│   │   │   │   ├── OrderEventProducer.java
│   │   │   │   ├── OrderEventConsumer.java
│   │   │   │   └── event/
│   │   │   │       ├── OrderCreatedEvent.java
│   │   │   │       └── OrderStatusChangedEvent.java
│   │   │   ├── repository/
│   │   │   │   ├── CustomerRepository.java
│   │   │   │   ├── ProductRepository.java
│   │   │   │   └── OrderRepository.java
│   │   │   └── service/
│   │   │       ├── OrderService.java
│   │   │       └── exception/
│   │   │           └── OrderNotFoundException.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── graphql/
│   │           └── schema.graphqls
│   └── test/java/com/example/ordermgmt/
│       ├── service/OrderServiceTest.java
│       ├── controller/OrderControllerTest.java
│       └── repository/OrderRepositoryTest.java
├── pom.xml
└── docker-compose.yml
```

Each package maps to an architectural layer:

| Package | Layer | Responsibility |
| --- | --- | --- |
| `domain/` | Persistence | JPA entities: database rows as Java objects |
| `repository/` | Persistence | Spring Data JPA interfaces: query methods |
| `dto/` | Transfer | Java records: immutable API payloads |
| `service/` | Business | Domain logic, `@Transactional`, Kafka publishing |
| `controller/` | API (REST) | HTTP verbs, request/response mapping |
| `graphql/` | API (GraphQL) | Query and mutation resolvers |
| `kafka/` | Messaging | Event production and consumption |
| `config/` | Configuration | Spring beans for infrastructure (Kafka topics, etc.) |

## Layered Architecture in Practice

The dependency rule is simple: **an outer layer may depend on an inner layer, but never the reverse.** The service layer depends on repositories and Kafka producers. Controllers depend on the service layer. The service layer never imports `controller` or `graphql`. It has no idea how its results are exposed.

```
// Controller calls service — REST layer
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.createOrder(request));
    }
}

// GraphQL resolver calls the SAME service — GraphQL layer
@Controller
public class OrderQueryResolver {
    private final OrderService orderService;

    public OrderQueryResolver(OrderService orderService) {
        this.orderService = orderService;
    }

    @QueryMapping
    public List<OrderResponse> orders() {
        return orderService.findAll();
    }
}
```

Both the REST controller and the GraphQL resolver inject `OrderService` and call the same methods. If a new business rule is added (say, a minimum order amount), you change it **once** in the service layer. Both APIs pick it up automatically.

## Domain Entities — JPA, Not Records

JPA entities use explicit getters and setters. JPA requires a no-arg constructor and mutable fields, so `record` won't work. DTOs, by contrast, are records: immutable, concise, perfect for API responses.

```
// Entity — mutable, JPA-managed
@Entity
@Table(name = "orders")
public class OrderEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerEntity customer;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL,
               orphanRemoval = true)
    private List<OrderItemEntity> items = new ArrayList<>();

    private BigDecimal totalAmount = BigDecimal.ZERO;

    public void recalculateTotal() {
        totalAmount = items.stream()
            .map(i -> i.getUnitPrice()
                       .multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

// DTO — immutable record, used in API responses
public record OrderResponse(
    Long id, Long customerId, String customerName,
    OrderStatus status, BigDecimal totalAmount,
    Instant createdAt, List<OrderItemResponse> items
) {
    public static OrderResponse from(OrderEntity entity) {
        return new OrderResponse(
            entity.getId(),
            entity.getCustomer().getId(),
            entity.getCustomer().getName(),
            entity.getStatus(),
            entity.getTotalAmount(),
            entity.getCreatedAt(),
            entity.getItems().stream()
                  .map(OrderItemResponse::from).toList()
        );
    }
}
```

The `from()` factory method converts an entity to a DTO. This is where you eagerly access lazy-loaded relationships while still inside a transaction, **before** the data leaves the service layer.

## Where WebFlux Fits

The streaming endpoint is a single controller method that returns a `Flux`. It does not replace the REST and GraphQL endpoints. Spring Boot can serve reactive and blocking endpoints side by side:

```
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    // ... blocking REST methods ...

    // This one method is reactive — returns SSE
    @GetMapping(value = "/{id}/status/stream",
                produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<OrderStatus> streamStatus(@PathVariable Long id) {
        return orderService.streamStatusUpdates(id);
    }
}
```

The capstone runs on Tomcat (Spring MVC with virtual threads). Blocking JPA endpoints execute on the virtual thread pool, which can scale to thousands of concurrent requests without exhausting platform threads. The reactive SSE streaming endpoint runs on the same server. Spring dispatches it through the WebFlux adapter while Tomcat handles the HTTP connection. The service layer's `streamStatusUpdates` method bridges the blocking repository world to the reactive streaming world using a `Sinks.Many`, a hot publisher that Kafka consumers push events into.

## Key Takeaways

-   **One service layer, multiple API styles.** REST, GraphQL, and WebFlux are presentation concerns. They adapt the same business logic to different client needs.
-   **Layered architecture prevents coupling.** Controllers, resolvers, and Kafka consumers all depend on the service layer. The service depends on repositories and producers. Dependencies flow inward only.
-   **Entities vs DTOs.** JPA entities are mutable and tied to the database. Java records are immutable and safe for API responses. Convert between them at the service boundary with `from()` factory methods.
-   **Kafka decouples producers from consumers.** The service publishes events. The consumer can notify users, update search indexes, or trigger downstream workflows, all without the service knowing.
-   **WebFlux is additive, not a replacement.** A single reactive streaming endpoint does not require rewriting the entire application in Reactor. Use it where real-time streaming is needed; keep blocking JPA everywhere else.

**Primary sources:** [Spring Boot Web (Servlet)](https://docs.spring.io/spring-boot/reference/web/servlet.html) · [Spring for GraphQL Reference](https://docs.spring.io/spring-graphql/reference/) · [Spring Kafka Reference](https://docs.spring.io/spring-kafka/reference/) · [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/reference/) · [Spring WebFlux Reference](https://docs.spring.io/spring-framework/reference/web/webflux.html)

## Check your understanding

<details>
<summary>1. A Spring Boot application exposes both a REST controller and a GraphQL resolver. Both inject OrderService and call createOrder(). What happens when a new validation rule is added to the service?</summary>
<p><strong>Correct answer:</strong> Both REST and GraphQL automatically enforce it because they share the same service method</p>
</details>

<details>
<summary>2. Why are DTOs implemented as Java records while JPA entities use classes with explicit getters and setters?</summary>
<p><strong>Correct answer:</strong> JPA requires no-arg constructors and mutable fields; records are final and immutable</p>
</details>

<details>
<summary>3. In the project structure, which package should OrderService import — controller or repository?</summary>
<p><strong>Correct answer:</strong> Only repository — the service layer depends inward, never on the API layer</p>
</details>

<details>
<summary>4. The capstone runs on Tomcat (Spring MVC with virtual threads). How does it serve both blocking JPA endpoints and a reactive SSE streaming endpoint?</summary>
<p><strong>Correct answer:</strong> Blocking endpoints run on Tomcat's virtual thread pool; the SSE endpoint is dispatched through Spring's WebFlux adapter on the same server</p>
</details>

<details>
<summary>5. When the OrderService.createOrder() method saves an order via JPA and then publishes a Kafka event, what ensures the event is only published if the database save succeeds?</summary>
<p><strong>Correct answer:</strong> The @Transactional annotation rolls back the DB save on any exception, including Kafka failures if the publish is inside the same method</p>
</details>
