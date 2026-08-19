---
title: "Reactive Patterns with R2DBC"
description: "Reactive Patterns with R2DBC"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0065-r2dbc-reactive-patterns.html
---

# Reactive Patterns with R2DBC

You have seen how Spring Data R2DBC replaces JPA's blocking calls with `Mono` and `Flux`. But real services need transactions, batch operations, error recovery, and composed database calls. This lesson covers the reactive patterns that make R2DBC work in production: transaction management with `ReactiveTransactionTemplate`, bulk operations, Project Reactor error handling, call composition, backpressure, and the cases where R2DBC is the wrong choice.

## Transaction Management in Reactive Code

JDBC transactions are bound to `ThreadLocal`. The connection is stored on the current thread, and Spring's `@Transactional` interceptor sets it up before your method runs and tears it down after. This model does not work in reactive code because a `Mono` or `Flux` may execute across multiple threads. The subscription that starts a database call and the callback that processes the result often run on different event-loop threads, so `ThreadLocal` cannot carry the connection.

Spring solves this with **reactive transactions**, which store the database connection in the Reactor `Context` instead of `ThreadLocal`. The `Context` travels with the reactive chain, so every operator in the pipeline can access the same connection regardless of which thread runs it.

### Declarative: @Transactional

Spring's `@Transactional` annotation works with R2DBC the same way it works with JPA. The interceptor detects the reactive return type and uses `Context`\-based transaction management:

```
@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private final OrderItemRepository itemRepo;

    @Transactional
    public Mono<Order> createOrder(OrderRequest request) {
        return orderRepo.save(Order.of(request))
            .flatMap(order -> {
                List<OrderItem> items = request.items().stream()
                    .map(i -> OrderItem.of(order.getId(), i))
                    .toList();
                return itemRepo.saveAll(items)
                    .collectList()
                    .thenReturn(order);
            });
    }
}
```

When `@Transactional` is on a method returning `Mono` or `Flux`, Spring automatically uses the reactive transaction manager. The transaction commits when the `Mono` completes successfully and rolls back when it errors.

### Programmatic: ReactiveTransactionTemplate

When you need fine-grained control over transaction boundaries, use `ReactiveTransactionTemplate`. It works like the blocking `TransactionTemplate` but returns `Mono`:

```
@Service
public class OrderService {

    private final ReactiveTransactionTemplate txTemplate;
    private final OrderRepository orderRepo;
    private final InventoryRepository inventoryRepo;

    public Mono<Order> reserveAndCreate(OrderRequest request) {
        return txTemplate.execute(status -> {
            return inventoryRepo.reserve(request.productId(), request.quantity())
                .flatMap(reserved -> {
                    if (!reserved) {
                        return Mono.error(new InsufficientStockException(
                            request.productId()));
                    }
                    return orderRepo.save(Order.of(request));
                });
        });
    }
}
```

`ReactiveTransactionTemplate.execute` takes a `TransactionCallback<T>` whose single method returns `Mono<T>`. The template opens the transaction, runs your callback, and commits or rolls back based on whether the `Mono` completes or errors. You configure it with a `ReactiveTransactionManager`:

```
@Bean
public ReactiveTransactionTemplate reactiveTransactionTemplate(
        ReactiveTransactionManager transactionManager) {
    return new ReactiveTransactionTemplate(transactionManager);
}
```

### Pitfall: Breaking the Chain

A transaction only covers operations that are **inside the reactive chain**. If you call a blocking method or start a new chain outside the callback, it runs without a transaction:

```
// WRONG: saveAll runs outside the transaction
public Mono<Order> createOrder(OrderRequest request) {
    return txTemplate.execute(status ->
        orderRepo.save(Order.of(request))
    ).flatMap(order -> {
        // This runs AFTER the transaction commits
        return itemRepo.saveAll(buildItems(order, request))
            .collectList()
            .thenReturn(order);
    });
}
```

The fix is to nest the `saveAll` inside the callback, as in the earlier examples.

## Batch Operations with R2DBC

Saving entities one at a time produces N round trips to the database. R2DBC supports batch operations that send multiple statements in a single round trip.

### saveAll with ReactiveCrudRepository

`ReactiveCrudRepository.saveAll` accepts an `Iterable` or `Flux` and returns a `Flux` of saved entities. The implementation depends on the driver: most drivers (including `r2dbc-postgresql`) batch the insert statements:

```
public Flux<OrderItem> saveAllItems(List<OrderItem> items) {
    return itemRepo.saveAll(items);
}
```

The returned `Flux` emits each saved entity as the database confirms it. If any insert fails, the `Flux` terminates with an error.

### Bulk Upserts with DatabaseClient

For UPDATE-or-INSERT logic, use `DatabaseClient` to execute a native batch statement. PostgreSQL supports `INSERT ... ON CONFLICT` for upserts:

```
@Service
public class InventoryService {

    private final DatabaseClient db;

    public Flux<Void> bulkUpsert(List<InventoryEntry> entries) {
        return Flux.fromIterable(entries)
            .flatMap(entry -> db.sql("""
                    INSERT INTO inventory (product_id, quantity)
                    VALUES (:productId, :quantity)
                    ON CONFLICT (product_id)
                    DO UPDATE SET quantity = inventory.quantity + :quantity
                """)
                .bind("productId", entry.productId())
                .bind("quantity", entry.quantity())
                .then());
    }
}
```

Each upsert is a separate statement through `DatabaseClient`. For true multi-row inserts in a single statement, build the SQL with parameter lists:

```
public Mono<Integer> batchInsert(List<Product> products) {
    String sql = "INSERT INTO products (name, price) VALUES ($1, $2)";
    return connectionFactory.create()
        .flatMapMany(conn -> {
            R2dbcStatement<Product> stmt = conn.createStatement(sql);
            for (int i = 0; i < products.size(); i++) {
                Product p = products.get(i);
                stmt.bind(0, p.getName()).bind(1, p.getPrice());
                if (i < products.size() - 1) {
                    stmt.add();
                }
            }
            return Flux.from(stmt.execute())
                .flatMap(Result::getRowsUpdated)
                .doFinally(signal -> conn.close());
        })
        .reduce(0, Integer::sum);
}
```

The `stmt.add()` call separates parameter sets within a single batched statement. The driver sends all rows to the database in one round trip.

## Error Handling in Reactive Database Flows

In JDBC code, you handle database errors with try-catch. In reactive code, errors propagate through the `Mono`/`Flux` chain and you handle them with Reactor operators.

### onErrorResume: Recover from Errors

`onErrorResume` is the reactive equivalent of a catch block. It catches an error and substitutes a fallback `Mono` or `Flux`:

```
public Mono<Order> findOrderOrEmpty(Long id) {
    return orderRepo.findById(id)
        .onErrorResume(R2dbcNonTransientException.class, e -> {
            log.warn("Database error fetching order {}", id, e);
            return Mono.empty();
        });
}
```

You can filter by exception type. Common R2DBC exceptions:

-   **`R2dbcNonTransientException`**: data integrity violations, constraint violations. These will fail on retry.
-   **`R2dbcTransientException`**: deadlocks, timeouts. These may succeed on retry.
-   **`R2dbcPermissionDeniedException`**: authentication or authorization failures.

### retry: Automatically Retry Transient Failures

For transient errors (deadlocks, connection timeouts), `retry` resubscribes to the source `Mono` or `Flux`:

```
public Mono<Order> saveWithRetry(Order order) {
    return orderRepo.save(order)
        .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
            .maxBackoff(Duration.ofSeconds(2))
            .filter(e -> e instanceof R2dbcTransientException)
            .doBeforeRetry(signal -> log.warn(
                "Retry {} for order save", signal.totalRetries())));
}
```

Key points about `retryWhen`:

-   **Exponential backoff** prevents hammering a struggling database. `Retry.backoff(3, Duration.ofMillis(100))` retries up to 3 times with a 100ms initial delay that doubles each attempt.
-   **Filter by exception type** so you only retry transient errors, not data integrity violations.
-   **The entire chain resubscribes** on retry, not just the failing operator. If your chain includes non-idempotent operations (like sending an email), use `retryWhen` only on the database portion.

### Combining onErrorResume and retry

Retry first, then fall back. This pattern retries transient errors and recovers from permanent ones:

```
public Mono<Order> findResilient(Long id) {
    return orderRepo.findById(id)
        .retryWhen(Retry.backoff(2, Duration.ofMillis(50))
            .filter(e -> e instanceof R2dbcTransientException))
        .onErrorResume(R2dbcNonTransientException.class, e -> {
            log.error("Permanent error for order {}", id, e);
            return Mono.empty();
        });
}
```

## Composition: Chaining Database Calls

Real service methods rarely make a single database call. You chain calls with Reactor operators.

### flatMap: Sequential Dependent Calls

Use `flatMap` when the second call depends on the result of the first. Each inner `Mono` subscribes after the previous one completes:

```
public Mono<OrderSummary> getOrderSummary(Long orderId) {
    return orderRepo.findById(orderId)
        .flatMap(order ->
            itemRepo.findByOrderId(orderId)
                .collectList()
                .map(items -> new OrderSummary(order, items))
        );
}
```

### concatMap: Ordered Dependent Calls

`concatMap` is like `flatMap` but preserves ordering and processes inner publishers one at a time. Use it with `Flux` sources when order matters:

```
public Flux<OrderWithItems> getOrdersWithItems(Long customerId) {
    return orderRepo.findByCustomerId(customerId)
        .concatMap(order ->
            itemRepo.findByOrderId(order.getId())
                .collectList()
                .map(items -> new OrderWithItems(order, items))
        );
}
```

`concatMap` processes one order at a time, ensuring the items for order 1 arrive before order 2 starts processing. `flatMap` with a concurrency limit (`flatMap(fn, 4)`) achieves the same ordering guarantee with controlled parallelism.

### zip: Parallel Independent Calls

When two calls are independent, `Mono.zip` runs them concurrently and combines the results:

```
public Mono<Dashboard> getDashboard(Long customerId) {
    Mono<List<Order>> orders = orderRepo.findByCustomerId(customerId)
        .collectList()
        .subscribeOn(Schedulers.boundedElastic());
    Mono<Customer> customer = customerRepo.findById(customerId)
        .subscribeOn(Schedulers.boundedElastic());

    return Mono.zip(orders, customer, Dashboard::new);
}
```

The `subscribeOn` calls ensure each query can start on a different thread. Without `subscribeOn`, Reactor may still interleave the subscriptions but the actual database calls could serialize on the same connection.

## Backpressure Considerations

Backpressure is the mechanism by which a `Flux` subscriber tells the publisher how many items it can process. Without backpressure, a fast database query can flood a slow consumer with more data than it can handle, causing out-of-memory errors.

### How R2DBC Handles Backpressure

R2DBC drivers that support cursors (PostgreSQL does) fetch rows incrementally. The driver requests rows from the database in batches as the subscriber signals demand, so a `Flux` from `findAll()` does not load the entire result set into memory.

### When Backpressure Matters

```
// Risk: unbounded in-memory accumulation
itemRepo.findByOrderId(orderId)
    .collectList()          // loads all items into memory
    .map(this::calculateTotal);

// Safer: process incrementally
itemRepo.findByOrderId(orderId)
    .reduce(BigDecimal.ZERO, (sum, item) ->
        sum.add(item.getPrice().multiply(
            BigDecimal.valueOf(item.getQuantity()))));
```

Use `reduce`, `scan`, or other incremental operators instead of `collectList` when the result set might be large. `collectList` is fine for small, bounded sets (order items for a single order).

### Rate Limiting with limitRate

When consuming a `Flux` from a large table, `limitRate` controls how many items the subscriber requests at a time:

```
productRepo.findAll()
    .limitRate(100)         // request 100 rows at a time
    .flatMap(product -> reindexService.index(product)
        .subscribeOn(Schedulers.parallel()), 32)
    .then();
```

`limitRate(100)` tells the database driver to fetch at most 100 rows per batch. The `flatMap` concurrency of 32 ensures at most 32 index operations run in parallel.

## When NOT to Use R2DBC

R2DBC is not a universal upgrade from JDBC. It adds complexity and limits your library choices. Weigh these factors before committing.

### Simple CRUD on a Blocking Stack

If your application uses Spring MVC, JPA, and handles moderate traffic, there is no benefit to R2DBC. The reactive pipeline requires every layer (controller, service, repository, driver) to be non-blocking. Mixing R2DBC into a blocking Spring MVC application gives you the complexity of reactive code without the throughput benefits.

### Existing JDBC Investment

If your team has years of JDBC experience, extensive JPA entity mappings, and mature Hibernate configurations, migrating to R2DBC means rewriting all of it. R2DBC has no lazy loading, no second-level cache, no dirty checking, and no JPA-compliant query language. You lose Hibernate's entire feature set.

### Library and Tool Compatibility

Many Java database tools assume JDBC:

-   **Flyway and Liquibase**: work with JDBC connections, not R2DBC. You still need a JDBC driver for migrations.
-   **jOOQ**: added R2DBC support, but the reactive API is less mature than its JDBC counterpart.
-   **Spring Batch**: designed around JDBC transaction management. R2DBC integration is limited.
-   **Monitoring tools**: JDBC proxies (P6Spy, SkyWalking) do not instrument R2DBC connections.

### When R2DBC Is the Right Choice

-   Your application is already on WebFlux and you need non-blocking database access end-to-end.
-   You are building a high-concurrency service where thread-per-request scaling is a bottleneck.
-   You are streaming large result sets to clients and want backpressure-aware database consumption.
-   Your database operations are simple reads and writes that do not need JPA's advanced features.

## Practical Example: Reactive Order Service

The following service demonstrates transactions, error handling, and composition in a single class:

```
@Service
public class ReactiveOrderService {

    private final ReactiveTransactionTemplate txTemplate;
    private final OrderRepository orderRepo;
    private final OrderItemRepository itemRepo;
    private final InventoryRepository inventoryRepo;

    public ReactiveOrderService(ReactiveTransactionTemplate txTemplate,
                                OrderRepository orderRepo,
                                OrderItemRepository itemRepo,
                                InventoryRepository inventoryRepo) {
        this.txTemplate = txTemplate;
        this.orderRepo = orderRepo;
        this.itemRepo = itemRepo;
        this.inventoryRepo = inventoryRepo;
    }

    /**
     * Create an order with items and inventory reservation
     * in a single transaction. Retries transient failures,
     * recovers from permanent ones.
     */
    public Mono<Order> createOrder(OrderRequest request) {
        return txTemplate.execute(status ->
            inventoryRepo.reserve(request.productId(), request.quantity())
                .flatMap(reserved -> {
                    if (!reserved) {
                        return Mono.error(
                            new InsufficientStockException(request.productId()));
                    }
                    return orderRepo.save(Order.of(request))
                        .flatMap(order -> {
                            List<OrderItem> items = request.items().stream()
                                .map(i -> OrderItem.of(order.getId(), i))
                                .toList();
                            return itemRepo.saveAll(items)
                                .collectList()
                                .thenReturn(order);
                        });
                })
        )
        .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
            .maxBackoff(Duration.ofSeconds(2))
            .filter(e -> e instanceof R2dbcTransientException)
            .doBeforeRetry(signal -> log.warn(
                "Retry {} for order creation", signal.totalRetries())))
        .onErrorResume(InsufficientStockException.class, e ->
            Mono.error(e))   // propagate business errors
        .onErrorResume(R2dbcNonTransientException.class, e -> {
            log.error("Failed to create order", e);
            return Mono.error(new OrderCreationException(
                "Order could not be created", e));
        });
    }

    /**
     * Fetch an order with its items. Independent queries
     * run concurrently with zip.
     */
    public Mono<OrderDetail> getOrderDetail(Long orderId) {
        Mono<Order> order = orderRepo.findById(orderId)
            .switchIfEmpty(Mono.error(
                new OrderNotFoundException(orderId)));
        Mono<List<OrderItem>> items = itemRepo.findByOrderId(orderId)
            .collectList();

        return Mono.zip(order, items, OrderDetail::new);
    }

    /**
     * Stream all orders for a customer with backpressure control.
     */
    public Flux<OrderSummary> getOrderSummaries(Long customerId) {
        return orderRepo.findByCustomerId(customerId)
            .limitRate(50)
            .concatMap(order ->
                itemRepo.findByOrderId(order.getId())
                    .reduce(BigDecimal.ZERO, (sum, item) ->
                        sum.add(item.getPrice()))
                    .map(total -> new OrderSummary(order, total))
            );
    }
}
```

Key patterns in this example:

-   **Transaction boundary wraps all related operations**: inventory check, order insert, and item inserts all run inside `txTemplate.execute`. If any step fails, the entire transaction rolls back.
-   **Ordered error handling**: `retryWhen` handles transient database errors before `onErrorResume` maps permanent errors to domain exceptions. Business exceptions (insufficient stock) pass through.
-   **Independent queries with zip**: fetching an order and its items are independent, so `Mono.zip` runs them concurrently.
-   **Backpressure with limitRate and reduce**: the streaming endpoint fetches items incrementally and accumulates totals without collecting the full list into memory.

**Primary sources:** [Spring Framework R2DBC Reference](https://docs.spring.io/spring-framework/reference/data-access/r2dbc.html) · [Spring Data R2DBC Transactions](https://docs.spring.io/spring-data/r2dbc/docs/current/reference/html/#r2dbc.transactions) · [Project Reactor Error Handling](https://projectreactor.io/docs/core/release/reference/html/#which-errors) · [R2DBC Specification 0.9](https://r2dbc.io/spec/0.9.1.RELEASE/spec/html/)

## Check your understanding

<details>
<summary>1. Why does Spring's @Transactional not work with R2DBC using the same ThreadLocal mechanism as JDBC?</summary>
<p><strong>Correct answer:</strong> Reactive chains may execute across multiple threads, so ThreadLocal cannot reliably carry the database connection</p>
</details>

<details>
<summary>2. You use ReactiveTransactionTemplate.execute to wrap an order save and an item save. The item save is chained with flatMap outside the callback. What happens?</summary>
<p><strong>Correct answer:</strong> The item save runs after the transaction commits, outside any transaction</p>
</details>

<details>
<summary>3. Your Flux from findAll() on a table with 500,000 rows occasionally causes out-of-memory errors. Which change addresses the root cause?</summary>
<p><strong>Correct answer:</strong> Replace collectList() with reduce() or add limitRate() to process rows incrementally</p>
</details>

<details>
<summary>4. You want to retry a database insert only on transient errors like deadlocks. Which retryWhen configuration is correct?</summary>
<p><strong>Correct answer:</strong> retryWhen(Retry.backoff(3, Duration.ofMillis(100)).filter(e -&gt; e instanceof R2dbcTransientException))</p>
</details>

<details>
<summary>5. Your Spring MVC application uses JPA, Hibernate, and handles moderate traffic. Your team suggests migrating to R2DBC for better performance. What is the strongest argument against it?</summary>
<p><strong>Correct answer:</strong> The application is on a blocking stack; R2DBC requires every layer to be non-blocking, and you lose JPA features (lazy loading, caching, dirty checking) without throughput gains</p>
</details>
