---
title: "Common Anti-Patterns & Module Review"
description: "Common Anti-Patterns & Module Review"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/05-service-oriented-architecture/0034-anti-patterns.md
---

# Common Anti-Patterns & Module Review

Knowing the right architecture is half the battle. The other half is **recognizing when you've drifted**. This lesson covers four anti-patterns that creep into Spring Boot codebases, explains when pragmatism beats purity, and ties together everything from Modules 02 through 05.

## Anti-Pattern 1: Fat Controller

A **fat controller** stuffs business logic (validation, calculations, data access) into the controller instead of delegating to the service layer. The controller inflates from 5 lines per method to 50.

```
// BAD — controller doing business logic
@PostMapping("/orders")
public ResponseEntity<OrderResponse> createOrder(
        @RequestBody CreateOrderRequest request) {
    CustomerEntity customer = customerRepository
        .findById(request.customerId()).orElseThrow();
    OrderEntity order = new OrderEntity();
    order.setCustomer(customer);
    for (CreateOrderItemRequest item : request.items()) {
        ProductEntity product = productRepository
            .findById(item.productId()).orElseThrow();
        product.setStock(product.getStock() - item.quantity());
        productRepository.save(product);
        // ... 20 more lines of logic
    }
    orderRepository.save(order);
    return ResponseEntity.ok(OrderResponse.from(order));
}
```

The controller now *depends on* `CustomerRepository`, `ProductRepository`, and `OrderRepository`, three dependencies it should never know about. It also bypasses `@Transactional`, so a partial failure leaves the database in an inconsistent state.

**Fix:** Move every business rule into the service. A controller method should be receive, delegate, return: three lines.

```
// GOOD — thin controller
@PostMapping("/orders")
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(orderService.createOrder(request));
}
```

## Anti-Pattern 2: Anemic Domain Model

An **anemic domain model** has entities that are just bags of getters and setters with no behavior. All logic lives in the service, which becomes a procedural script draped over objects.

```
// BAD — entity with no behavior
order.setStatus(OrderStatus.CONFIRMED);
order.setTotalAmount(BigDecimal.ZERO);
// Service calculates totals, enforces state transitions, etc.
```

Nothing stops a caller from setting an `OrderStatus` of `CONFIRMED` on a cancelled order, or a negative total. The entity can't defend its own invariants.

```
// GOOD — entity encapsulates its rules
OrderEntity order = new OrderEntity(customer);
order.addItem(product, 3);   // entity calculates line total
order.confirm();              // entity enforces state transitions
```

When the entity owns its rules, the service orchestrates *workflow* (find customer, reserve stock, save) without micromanaging state. If the rule for "confirmed" changes, you change it in one place (the entity), not across twelve service methods.

## Anti-Pattern 3: Transaction Manager Anti-Pattern

This is the subtlest anti-pattern. It happens when a **service method manages transactions manually** or when transaction boundaries are placed at the wrong layer. The classic form: a service calls multiple repository methods without `@Transactional`, relying on each save to commit independently, or slapping `@Transactional` on the controller instead of the service.

```
// BAD — no transaction boundary; partial writes on failure
public OrderResponse createOrder(CreateOrderRequest request) {
    CustomerEntity customer = customerRepo.findById(request.customerId())
        .orElseThrow(() -> new CustomerNotFoundException(request.customerId()));
    OrderEntity order = buildOrder(request);
    orderRepo.save(order);         // commits immediately
    reserveStock(request.items()); // if this fails, order is already committed!
    return OrderResponse.from(order);
}
```

The order is committed before stock is reserved. If `reserveStock` throws, you have an order with unavailable products: an inconsistent database.

The mirror mistake: putting `@Transactional` on the controller. Now the transaction boundary depends on the HTTP layer, making the service untestable in isolation and tying database semantics to web requests.

```
// GOOD — transaction on the service, the layer that owns the logic
@Service
public class OrderService {
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // ALL operations succeed or ALL roll back
        CustomerEntity customer = customerRepo.findById(request.customerId())
            .orElseThrow(() -> new CustomerNotFoundException(request.customerId()));
        OrderEntity order = buildOrder(request);
        reserveStock(request.items());
        orderRepo.save(order);
        return OrderResponse.from(order);
    }
}
```

Another variant: **self-invocation** bypassing the proxy. Calling a `@Transactional(propagation = REQUIRES_NEW)` method via `this.processOne(id)` skips the Spring proxy entirely, so the annotation has no effect. Extract the method into a separate bean or inject a self-reference.

## Anti-Pattern 4: God Object

A **god object** is one class that does everything: orders, payments, shipping, notifications, inventory. Its constructor takes ten dependencies. Its methods stretch to hundreds of lines. Changing anything requires understanding everything.

```
// BAD — one service to rule them all
@Service
public class OrderManagementService {
    private final OrderRepository orderRepo;
    private final PaymentGateway paymentGateway;
    private final ShippingClient shippingClient;
    private final EmailService emailService;
    private final InventoryService inventoryService;
    private final SmsService smsService;
    // ... 6+ more dependencies

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        // 100 lines spanning payment, shipping, email, inventory...
    }
}
```

**Fix:** Split into focused services with single responsibilities. `OrderService` orchestrates the order; `PaymentService` handles payment; `InventoryService` manages stock. Use application events for side effects like notifications.

## When to Violate the Layered Rule

The layered rule (controller → service → repository) is a guideline, not a law. Pragmatic violations are fine when the alternative is worse. A few justified cases:

**Read-only passthrough.** If a controller needs a simple list and the service would just call `repo.findAll()` and return it, a thin service method is still preferred, but a *dedicated* service method, not a direct repository injection in the controller. The cost is one trivial method; the payoff is that when authorization, caching, or filtering get added later, there's already a place for them.

**Reporting queries.** A dashboard that joins five tables and aggregates results may need a dedicated `ReportRepository` with a native query. The service layer can still own the method call, keeping the boundary clean even when the SQL is complex.

**Rapid prototyping.** In a hackathon or a proof-of-concept, skip the service layer. But add a `// TODO: extract to service` comment so the shortcut is visible when the prototype becomes production code.

The rule of thumb: **violate the rule deliberately, not accidentally.** If you can explain why the shortcut is there and when you'd remove it, it's a conscious trade-off. If you can't, it's probably an anti-pattern.

## Module Review: Tying It All Together

Modules 02 through 05 built a complete, layered Spring Boot application one concept at a time. Here is how each module connects:

| Module | Core Idea | Key Annotation / Pattern |
| --- | --- | --- |
| 02: Dependency Injection | Spring creates and wires objects; you declare what you need | `@Component`, `@Service`, `@Autowired`, constructor injection |
| 03: Spring Boot Fundamentals | Auto-configuration and REST endpoints | `@SpringBootApplication`, `@RestController`, `@Valid`, `ResponseEntity` |
| 04: Repository Pattern | Database access through interfaces, not SQL strings | `@Entity`, `JpaRepository`, derived queries, `@Query` |
| 05: Service-Oriented Architecture | Business logic in the service layer, thin controllers, events for decoupling | `@Transactional`, DTOs, domain exceptions, `@EventListener` |

The data flows in one direction:

```
HTTP request
  → Controller (validates, delegates)
    → Service (business logic, transaction boundary)
      → Repository (data access)
        → Database
```

And the responses flow back:

```
Database
  → Repository (entity)
    → Service (converts entity → DTO)
      → Controller (wraps DTO in ResponseEntity)
        → HTTP response
```

Every piece has one job. Every dependency points downward. Every layer can be tested in isolation with a mock of the layer below. That is the payoff of service-oriented architecture.

**Primary sources:** [Spring: IoC Container](https://docs.spring.io/spring-framework/reference/core/beans.html) · [Spring Boot: Auto-configuration](https://docs.spring.io/spring-boot/reference/features/profiles.html) · [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/reference/) · [Spring: Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)

## Check your understanding

<details>
<summary>1. A controller directly injects OrderRepository and calls save() inside a @PostMapping method. Which anti-pattern is this?</summary>
<p><strong>Correct answer:</strong> Fat controller</p>
</details>

<details>
<summary>2. A service method saves an order and then reserves stock, but the method has no @Transactional. The stock reservation fails. What happens to the order?</summary>
<p><strong>Correct answer:</strong> The order is already committed — the database is now inconsistent</p>
</details>

<details>
<summary>3. An OrderEntity has only getters and setters — no methods that enforce state transitions. All status-change logic lives in OrderService. Which anti-pattern does this describe?</summary>
<p><strong>Correct answer:</strong> Anemic domain model</p>
</details>

<details>
<summary>4. A service calls this.processOne(id) on its own @Transactional(propagation = REQUIRES_NEW) method. What actually happens?</summary>
<p><strong>Correct answer:</strong> The proxy is bypassed — the method runs in the caller's existing transaction</p>
</details>

<details>
<summary>5. Your team is prototyping and a controller calls a repository directly for a simple lookup, with a // TODO comment. Is this acceptable?</summary>
<p><strong>Correct answer:</strong> Yes — for rapid prototyping with an explicit comment marking it as a shortcut</p>
</details>
