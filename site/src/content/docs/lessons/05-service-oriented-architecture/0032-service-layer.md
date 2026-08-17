---
title: "The Service Layer & @Transactional"
description: "The Service Layer & @Transactional"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0032-service-layer.html
---

# The Service Layer & `@Transactional`

In layered architecture, the service layer is the **brain** — it enforces business rules, orchestrates repository calls, and keeps controllers thin. But when a single method touches multiple tables, you need a guarantee: either everything saves correctly, or nothing does. That guarantee is `@Transactional`.

## What belongs in a service method?

A service method does three things a controller or repository won't:

-   **Business rules** — "An order must be PENDING to confirm it."
-   **Orchestration** — look up the customer, check stock, reserve stock, calculate total, save the order — all in one call.
-   **Transaction boundaries** — if any step fails, undo every database change made so far.

Controllers handle HTTP. Repositories handle SQL. **Everything between them is the service layer's job.**

## The `@Transactional` annotation

Spring's `@Transactional` wraps a method in a database transaction. The lifecycle is simple:

1.  **Before the method** — Spring opens a transaction (starts a database connection and begins a unit of work).
2.  **During the method** — every `save()`, `delete()`, or update happens inside that transaction. Other transactions can't see your uncommitted changes.
3.  **After the method** — if the method returns normally, Spring **commits** the transaction (all changes become permanent). If an unhandled runtime exception propagates out, Spring **rolls back** the transaction (every change is undone).

```
@Transactional
public OrderResponse createOrder(CreateOrderRequest request) {
    // Transaction starts here ─────────────────────┐
    Customer customer = customerRepository           // │
            .findById(request.customerId())          // │
            .orElseThrow(() -> new CustomerNotFoundException(...));
                                                     // │
    // If this throws, everything above is rolled back
    product.setStock(product.getStock() - qty);      // │
    productRepository.save(product);                 // │
                                                     // │
    OrderEntity saved = orderRepository.save(order);
    return OrderResponse.from(saved);
    // Transaction commits here ─────────────────────┘
}
```

Coincidence is not a strategy. Without `@Transactional`, each `save()` commits independently — a crash after the first save leaves the database inconsistent.

## Read-only transactions

Not every service method writes data. For read operations, use `@Transactional(readOnly = true)`:

```
@Transactional(readOnly = true)
public OrderResponse getOrderById(Long id) {
    return orderRepository.findById(id)
            .map(OrderResponse::from)
            .orElseThrow(() -> new OrderNotFoundException(id));
}
```

`readOnly = true` is not just documentation — it's a **performance hint**. The database and ORM can:

-   Skip dirty-checking (no need to compare entity state at flush time).
-   Avoid acquiring write locks on rows.
-   Route the query to a read replica if one is configured.

Rule of thumb: **every public service method should be `@Transactional`**. If it only reads, add `readOnly = true`. If it writes, leave the default.

## How `@Transactional` really works — proxy-based AOP

Spring does not modify your class bytecode. Instead, it creates a **proxy** — a wrapper object that intercepts calls to your bean. When you call `orderService.createOrder(…)`, you're calling the proxy, which:

1.  Opens a transaction from the `PlatformTransactionManager`.
2.  Delegates to the real `createOrder` method.
3.  On normal return: commits. On exception: rolls back.

This proxy mechanism has a critical consequence: **`@Transactional` on a `private` or `protected` method does nothing.** The proxy can only intercept `public` methods. A `private` method call is a direct `this.method()` inside the class — the proxy never sees it, no transaction is opened.

```
// WRONG — transaction is never created
@Transactional
private void reserveStock(ProductEntity product, int qty) { ... }

// RIGHT — make it public, or call it from a transactional public method
@Transactional
public void reserveStock(ProductEntity product, int qty) { ... }
```

## Rollback rules

By default, `@Transactional` rolls back on **unchecked exceptions** (subclasses of `RuntimeException`) but **not** on checked exceptions. This is a deliberate design choice — checked exceptions are declared in the method signature and are expected; runtime exceptions signal unexpected failure.

```
// Rolls back: runtime exception
@Transactional
public void createOrder() {
    throw new InsufficientStockException(...); // unchecked → rollback
}

// Does NOT roll back by default: checked exception
@Transactional
public void createOrder() throws IOException {
    throw new IOException("disk full"); // checked → committed!
}

// Override: roll back on checked exceptions too
@Transactional(rollbackFor = Exception.class)
public void createOrder() throws IOException {
    throw new IOException("disk full"); // now rolls back
}
```

Always use `rollbackFor = Exception.class` when your method declares checked exceptions. For service methods that only throw runtime exceptions (the common case), the default is fine.

## Complete `OrderService` example

```
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    public OrderService(OrderRepository orderRepository,
                        ProductRepository productRepository,
                        CustomerRepository customerRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        CustomerEntity customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new CustomerNotFoundException(request.customerId()));

        OrderEntity order = new OrderEntity();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING);
        order.setCreatedAt(Instant.now());

        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderItemRequest item : request.items()) {
            ProductEntity product = productRepository.findById(item.productId())
                    .orElseThrow(() -> new ProductNotFoundException(item.productId()));

            if (product.getStock() < item.quantity()) {
                throw new InsufficientStockException(
                        product.getId(), product.getStock(), item.quantity());
            }

            product.setStock(product.getStock() - item.quantity());
            productRepository.save(product);

            OrderItemEntity orderItem = new OrderItemEntity();
            orderItem.setProduct(product);
            orderItem.setQuantity(item.quantity());
            orderItem.setUnitPrice(product.getPrice());
            orderItem.setOrder(order);
            order.getItems().add(orderItem);

            total = total.add(product.getPrice()
                    .multiply(BigDecimal.valueOf(item.quantity())));
        }
        order.setTotalAmount(total);

        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id) {
        return orderRepository.findById(id)
                .map(OrderResponse::from)
                .orElseThrow(() -> new OrderNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByCustomer(Long customerId) {
        return orderRepository.findByCustomerId(customerId).stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional
    public OrderResponse confirmOrder(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException(
                    "Order must be PENDING to confirm");
        }
        order.setStatus(OrderStatus.CONFIRMED);
        return OrderResponse.from(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse cancelOrder(Long orderId) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new IllegalStateException("Cannot cancel a delivered order");
        }

        for (OrderItemEntity item : order.getItems()) {
            ProductEntity product = item.getProduct();
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }

        order.setStatus(OrderStatus.CANCELLED);
        return OrderResponse.from(orderRepository.save(order));
    }
}
```

Notice the pattern: **write methods use `@Transactional`**, **read methods use `@Transactional(readOnly = true)`**. Every public method is transactional. Every method tosses domain-specific exceptions rather than returning `null`.

## What makes this a good service?

-   **Single responsibility** — only order-related business logic.
-   **Constructor injection** — dependencies are explicit and `final`.
-   **Transaction boundaries** — every method declares its transactional intent.
-   **Domain exceptions** — `OrderNotFoundException`, `InsufficientStockException` — not generic `RuntimeException`.
-   **DTOs in and out** — `CreateOrderRequest` enters, `OrderResponse` exits. Entities never leak to the controller.

**Primary sources:** [Spring: @Transactional](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) · [Spring: Transactional Advice](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-advice-above.html) · [Oracle: JDBC Transactions](https://docs.oracle.com/javase/tutorial/jdbc/basics/transactions.html)

## Check your understanding

<details>
<summary>1. What happens when a method annotated with @Transactional throws a RuntimeException?</summary>
<p><strong>Correct answer:</strong> The transaction rolls back and no changes are persisted</p>
</details>

<details>
<summary>2. Why does @Transactional on a private method have no effect?</summary>
<p><strong>Correct answer:</strong> The Spring proxy intercepts only public calls; private and protected calls bypass it</p>
</details>

<details>
<summary>3. What is the concrete benefit of @Transactional(readOnly = true) over plain @Transactional for a method that only reads data?</summary>
<p><strong>Correct answer:</strong> It skips dirty-checking and avoids write locks, allowing database optimizations</p>
</details>

<details>
<summary>4. In createOrder, if InsufficientStockException is thrown after two products have already had their stock decremented and saved, what is the state of the database?</summary>
<p><strong>Correct answer:</strong> All changes are rolled back — stock and order are unchanged</p>
</details>

<details>
<summary>5. By default, @Transactional does not roll back on which kind of exception?</summary>
<p><strong>Correct answer:</strong> IOException</p>
</details>
