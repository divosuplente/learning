---
title: "DTOs, Domain Exceptions & Application Events"
description: "DTOs, Domain Exceptions & Application Events"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0033-dtos-and-events.html
---

# DTOs, Domain Exceptions & Application Events

So far your service layer returns entities straight to the controller. That works, until a client overwrites a server-managed field, or you add a lazy-loaded association that crashes during serialization, or two services need to talk without creating a circular dependency. This lesson covers three patterns that solve all three problems: **Data Transfer Objects** to control what crosses layer boundaries, **domain exceptions** to make errors meaningful, and **application events** to decouple services that need to react to each other.

## Why Not Return Entities Directly?

It's tempting: the entity has all the data, so just serialize it as JSON. Three things go wrong:

**1\. Security.** Your `OrderEntity` has `id` and `createdAt` set by the server. If you accept the entity as a request body, a malicious client can set `id` to overwrite an existing order or fake `createdAt`. You've just let the client tamper with server-managed fields.

**2\. Coupling.** Jackson serializes every field it can reach, including lazy-loaded `@ManyToOne` relationships. Add a field to the entity, and every API consumer sees it. Your database schema becomes your API contract, and you can never change one without breaking the other.

**3\. Shape mismatch.** A create request needs `customerId` and `items`. A response needs `id`, `status`, and `totalAmount`. They carry different data; one object can't do both jobs well.

## Data Transfer Objects

A **DTO** is a simple object that carries data between layers. Request DTOs define what comes in; response DTOs define what goes out. **Java records** are ideal: they're immutable, compact, and don't need boilerplate getters.

### Request DTO

```
public record CreateOrderRequest(
        @NotNull(message = "Customer ID is required") Long customerId,
        @NotEmpty(message = "Order must have at least one item")
        List<@NotNull CreateOrderItemRequest> items
) {}
```

```
public record CreateOrderItemRequest(
        @NotNull(message = "Product ID is required") Long productId,
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1") Integer quantity
) {}
```

Validation annotations (`@NotNull`, `@Min`, `@NotEmpty`) come from the **Jakarta Bean Validation** API. Spring Boot 3.x uses the `jakarta.validation` namespace, not the older `javax.validation`.

### Response DTO

```
public record OrderResponse(
        Long id,
        Long customerId,
        String customerName,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt,
        List<OrderItemResponse> items
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
                        .map(OrderItemResponse::from)
                        .toList()
        );
    }
}
```

### The `from()` Factory Method

Each response DTO has a `static from(Entity)` method that maps the entity to the DTO. This keeps the conversion in one place, is easy to test, and avoids needing a separate mapper class. For complex mappings with dozens of fields, **MapStruct** generates mapper code at compile time, but manual `from()` methods are clearer for learning and sufficient for most services.

The key principle: **entities never leave the service layer.** The controller receives a DTO and returns a DTO. The repository returns an entity. The service converts between them.

## Domain Exceptions

Throwing `RuntimeException("Not found")` tells the caller nothing. Throwing `OrderNotFoundException(orderId)` tells the caller *exactly* what went wrong and with what data. Domain exceptions make your errors part of your API.

### Custom Exception Hierarchy

```
// Base exception — all domain errors extend this
public class OrderManagementException extends RuntimeException {
    public OrderManagementException(String message) {
        super(message);
    }
    public OrderManagementException(String message, Throwable cause) {
        super(message, cause);
    }
}

// Specific exception carries the ID that wasn't found
public class OrderNotFoundException extends OrderManagementException {
    private final Long orderId;
    public OrderNotFoundException(Long orderId) {
        super("Order not found: " + orderId);
        this.orderId = orderId;
    }
    public Long getOrderId() { return orderId; }
}

// Rich exception carries multiple relevant fields
public class InsufficientStockException extends OrderManagementException {
    private final Long productId;
    private final int availableStock;
    private final int requestedQuantity;
    public InsufficientStockException(Long productId,
            int availableStock, int requestedQuantity) {
        super(String.format(
            "Insufficient stock for product %d: available=%d, requested=%d",
            productId, availableStock, requestedQuantity));
        this.productId = productId;
        this.availableStock = availableStock;
        this.requestedQuantity = requestedQuantity;
    }
    // getters
}
```

### Why a Hierarchy?

Having all custom exceptions extend `OrderManagementException` means:

-   Catch all domain errors with one `catch` block if needed
-   Handle specific exceptions differently in `@RestControllerAdvice`
-   The exception type itself documents what went wrong

Your `@RestControllerAdvice` catches `OrderNotFoundException` → 404, `InsufficientStockException` → 409, and the base `OrderManagementException` → 400 as a catch-all. Specific handlers first; generic last.

## Application Events

When `OrderService` needs to notify `CustomerService` that an order was placed, you *could* inject `CustomerService` directly. But if `CustomerService` also calls `OrderService`, you get a **circular dependency** and Spring won't start. Application events solve this: the publisher doesn't know who listens.

### Define an Event

```
public record OrderCreatedEvent(
        Long orderId,
        Long customerId,
        BigDecimal totalAmount,
        Instant createdAt
) {}
```

A record, immutable and trivial to construct. Events should carry only what the listener needs, not the entire entity.

### Publish from the Service

```
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    private final OrderRepository orderRepository;

    public OrderService(ApplicationEventPublisher eventPublisher,
            OrderRepository orderRepository /*, ... */) {
        this.eventPublisher = eventPublisher;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // ... order creation logic ...

        OrderEntity savedOrder = orderRepository.save(order);

        // Publish — anyone listening will be notified
        eventPublisher.publishEvent(new OrderCreatedEvent(
                savedOrder.getId(),
                savedOrder.getCustomer().getId(),
                savedOrder.getTotalAmount(),
                savedOrder.getCreatedAt()
        ));

        return OrderResponse.from(savedOrder);
    }
}
```

### Listen to Events

```
@Component
public class OrderEventListener {

    private static final Logger log =
            LoggerFactory.getLogger(OrderEventListener.class);

    // Fires immediately — even if the transaction rolls back
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        log.info("order_created_event orderId={}", event.orderId());
    }

    // Fires ONLY after the transaction commits successfully
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCreatedAfterCommit(OrderCreatedEvent event) {
        notificationService.sendOrderConfirmation(event.orderId());
    }
}
```

`@EventListener` fires synchronously when `publishEvent()` is called, even if the transaction later rolls back. `@TransactionalEventListener(phase = AFTER_COMMIT)` fires **only after** the transaction commits. Use `@EventListener` for synchronous side-effects within the same transaction (like updating a cache). Use `@TransactionalEventListener` for anything that must only happen if the data actually persisted: sending emails, calling external APIs, publishing to Kafka.

### Events vs Direct Calls

| Approach | Coupling | When to Use |
| --- | --- | --- |
| Direct method call | Tight: caller depends on callee | You need the result immediately |
| Application event | Loose: publisher unaware of listeners | You want to notify without waiting |

**Primary sources:** [Spring: The IoC Container](https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html) · [Spring: Application Events](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html#beans-factory-extension-factorybean) · [Jakarta Bean Validation 3.0](https://jakarta.ee/specifications/bean-validation/3.0/apidocs/)

## Check your understanding

<details>
<summary>1. What is the primary security risk of returning a JPA entity directly as a REST response?</summary>
<p><strong>Correct answer:</strong> A malicious client could set server-managed fields like id in a request</p>
</details>

<details>
<summary>2. Why should all domain exceptions extend a common base class like OrderManagementException?</summary>
<p><strong>Correct answer:</strong> You can catch all domain errors with one block and handle specifics separately</p>
</details>

<details>
<summary>3. What happens if @EventListener processes an event and the publishing transaction then rolls back?</summary>
<p><strong>Correct answer:</strong> The listener already executed — its side-effects are not rolled back</p>
</details>

<details>
<summary>4. A response DTO uses a static from(Entity) method instead of a separate mapper class. When would MapStruct be the better choice?</summary>
<p><strong>Correct answer:</strong> When mappings involve dozens of fields and nested objects</p>
</details>

<details>
<summary>5. You want to send an order confirmation email only if the order actually persisted to the database. Which approach is correct?</summary>
<p><strong>Correct answer:</strong> Use @TransactionalEventListener(phase = AFTER_COMMIT)</p>
</details>
