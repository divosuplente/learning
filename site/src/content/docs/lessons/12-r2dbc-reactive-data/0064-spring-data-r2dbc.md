---
title: "Spring Data R2DBC Repositories"
description: "Spring Data R2DBC Repositories"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0064-spring-data-r2dbc.html
---

# Spring Data R2DBC Repositories

Spring Data JPA provides synchronous repositories backed by Hibernate. Spring Data R2DBC provides the same repository abstraction, but every method returns `Mono` or `Flux` and every database call is non-blocking. This lesson covers reactive entities, `ReactiveCrudRepository`, derived queries, `@Query` with native SQL, and a side-by-side comparison with JPA.

## Reactive Entities

R2DBC entities look similar to JPA entities but use different annotations from `org.springframework.data.annotation` and `org.springframework.data.relational.core.mapping`. There is no lazy loading, no dirty checking, and no second-level cache. An R2DBC entity is a plain data container mapped to a row.

```
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.data.relational.core.mapping.Column;

@Table("orders")
public class Order {

    @Id
    private Long id;

    @Column("customer_name")
    private String customerName;

    private String status;
    private LocalDateTime createdAt;

    // Default constructor required by Spring Data
    public Order() {}

    public Order(String customerName, String status, LocalDateTime createdAt) {
        this.customerName = customerName;
        this.status = status;
        this.createdAt = createdAt;
    }

    // Getters and setters omitted for brevity
}
```

Key differences from JPA entities:

-   **No `@Entity`**: use `@Table` from Spring Data, not `javax.persistence`
-   **No `@GeneratedValue`**: R2DBC does not define an ID generation strategy. Databases handle auto-increment natively, or you generate IDs yourself.
-   **No lazy loading**: relationships are not proxied. Fetch what you need in the query.
-   **No `@OneToMany` / `@ManyToOne`**: R2DBC has no object-relational mapping. Model related data as separate queries or embed it inline.

## ReactiveCrudRepository

Where JPA uses `JpaRepository`, R2DBC uses `ReactiveCrudRepository`. The interface is in `org.springframework.data.repository.reactive`. It provides the same CRUD operations but returns reactive types:

```
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

public interface OrderRepository extends ReactiveCrudRepository<Order, Long> {

    // Inherited methods — all reactive:
    // Mono<Order>       findById(Long id)
    // Flux<Order>       findAll()
    // Mono<Order>       save(Order entity)
    // Mono<Void>        deleteById(Long id)
    // Mono<Long>        count()
}
```

Spring Boot auto-configures the implementation when `spring-boot-starter-data-r2dbc` is on the classpath and a `ConnectionFactory` bean exists. You do not write an implementation class.

### Dependency Setup

```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-r2dbc</artifactId>
</dependency>

<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>r2dbc-postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

Configure the connection in `application.yml`:

```
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/orderdb
    username: postgres
    password: secret
```

Note the `r2dbc:` scheme, not `jdbc:`. R2DBC uses its own driver protocol.

## Derived Query Methods

Spring Data R2DBC supports the same derived query convention as JPA. The method name expresses the predicate; Spring generates the SQL at startup. The difference is the return type: use `Flux` for multiple results and `Mono` for zero or one.

```
public interface OrderRepository extends ReactiveCrudRepository<Order, Long> {

    Flux<Order> findByStatus(String status);

    Flux<Order> findByCustomerNameAndStatus(String customerName, String status);

    Mono<Order> findFirstByCustomerNameOrderByCreatedAtDesc(String customerName);

    Flux<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    Mono<Long> countByStatus(String status);

    Mono<Void> deleteByStatus(String status);
}
```

The derivation rules are identical to JPA: `findBy`, `And`/`Or`, `Between`, `OrderBy`, `First`, `countBy`, `deleteBy`. What changes is that every method returns a reactive type.

## @Query with Native SQL

When derived queries cannot express what you need, use `@Query` with plain SQL. R2DBC does not have JPQL or HQL. The query string is native SQL against your database.

```
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;

public interface OrderRepository extends ReactiveCrudRepository<Order, Long> {

    @Query("SELECT * FROM orders WHERE customer_name = :name AND status = :status")
    Flux<Order> findByCustomerAndStatus(@Param("name") String name,
                                         @Param("status") String status);

    @Query("SELECT * FROM orders WHERE created_at > :since ORDER BY created_at DESC LIMIT :limit")
    Flux<Order> findRecentOrders(@Param("since") LocalDateTime since,
                                  @Param("limit") int limit);

    @Query("UPDATE orders SET status = :newStatus WHERE id = :id")
    Mono<Integer> updateStatus(@Param("id") Long id, @Param("newStatus") String newStatus);
}
```

Named parameters use `:paramName` syntax. Bind them with `@Param`. The return type follows the same rule: `Flux<Order>` for rows, `Mono<Integer>` for update counts.

## Saving, Finding, Deleting

Every operation on a reactive repository returns a `Mono` or `Flux`. Nothing happens until you subscribe. In a WebFlux controller, the framework subscribes for you when the `Mono` or `Flux` is returned from a handler method.

### Saving

```
@Service
public class OrderService {

    private final OrderRepository repo;

    public OrderService(OrderRepository repo) {
        this.repo = repo;
    }

    public Mono<Order> createOrder(String customerName, String status) {
        Order order = new Order(customerName, status, LocalDateTime.now());
        return repo.save(order);
        // save() returns Mono<Order> with the generated id populated
    }
}
```

`save()` inserts if the entity has no `@Id` value and updates if it does. The returned `Mono` contains the entity with the database-generated ID.

### Finding

```
public Mono<Order> getOrder(Long id) {
    return repo.findById(id)
        .switchIfEmpty(Mono.error(new OrderNotFoundException(id)));
}

public Flux<Order> getPendingOrders() {
    return repo.findByStatus("PENDING");
}
```

`findById` returns an empty `Mono` when no row matches. Chain `.switchIfEmpty()` to convert that into an error or a default.

### Deleting

```
public Mono<Void> removeOrder(Long id) {
    return repo.deleteById(id);
}

public Mono<Void> cancelPendingOrders(String customerName) {
    return repo.findByCustomerNameAndStatus(customerName, "PENDING")
        .flatMap(order -> {
            order.setStatus("CANCELLED");
            return repo.save(order);
        })
        .then();
}
```

`deleteById` returns `Mono<Void>`. For conditional deletes, find first, mutate, save back. The `.then()` call on the final `Flux` discards the emitted values and returns `Mono<Void>` when the stream completes.

## JPA vs R2DBC: Repository Comparison

| Aspect | Spring Data JPA | Spring Data R2DBC |
| --- | --- | --- |
| Base interface | `JpaRepository<T, ID>` | `ReactiveCrudRepository<T, ID>` |
| Return types | `Optional<T>`, `List<T>`, `void` | `Mono<T>`, `Flux<T>`, `Mono<Void>` |
| Query language | JPQL / HQL + native SQL | Native SQL only |
| Entity annotations | `javax.persistence.*` | `org.springframework.data.*` |
| Lazy loading | Yes (proxied) | No |
| Relationships | `@OneToMany`, `@ManyToOne`, etc. | Not supported; model as separate queries |
| Dirty checking | Automatic on transaction commit | No; explicit `save()` required |
| Transactions | `@Transactional` | `@Transactional` (reactive, from `org.springframework.transaction`) |
| Schema generation | `spring.jpa.hibernate.ddl-auto` | None; use Flyway or Liquibase |
| Connection pool | HikariCP (blocking) | R2DBC pool (e.g. `r2dbc-pool`) |

The trade-off: JPA provides ORM features (lazy loading, dirty checking, cascading) at the cost of blocking I/O and thread-per-request. R2DBC provides non-blocking I/O but leaves object-relational mapping to you.

## Full Example: Reactive OrderRepository

A complete repository interface, entity, service, and controller wired end-to-end with R2DBC:

```
// --- Entity ---
@Table("orders")
public class Order {

    @Id
    private Long id;

    @Column("customer_name")
    private String customerName;

    private String status;
    private LocalDateTime createdAt;

    public Order() {}

    public Order(String customerName, String status, LocalDateTime createdAt) {
        this.customerName = customerName;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCustomerName() { return customerName; }
    public void setStatus(String status) { this.status = status; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}

// --- Repository ---
public interface OrderRepository extends ReactiveCrudRepository<Order, Long> {

    Flux<Order> findByStatus(String status);

    Flux<Order> findByCustomerNameOrderByCreatedAtDesc(String customerName);

    Mono<Long> countByStatus(String status);

    @Query("SELECT * FROM orders WHERE created_at > :since AND status = :status")
    Flux<Order> findCreatedSince(@Param("since") LocalDateTime since,
                                  @Param("status") String status);
}

// --- Service ---
@Service
public class OrderService {

    private final OrderRepository repo;

    public OrderService(OrderRepository repo) {
        this.repo = repo;
    }

    public Mono<Order> create(String customerName) {
        return repo.save(new Order(customerName, "PENDING", LocalDateTime.now()));
    }

    public Mono<Order> findById(Long id) {
        return repo.findById(id);
    }

    public Flux<Order> findPending() {
        return repo.findByStatus("PENDING");
    }

    public Mono<Order> ship(Long id) {
        return repo.findById(id)
            .map(order -> {
                order.setStatus("SHIPPED");
                return order;
            })
            .flatMap(repo::save);
    }

    public Flux<Order> recentByCustomer(String customerName) {
        return repo.findByCustomerNameOrderByCreatedAtDesc(customerName);
    }
}

// --- Controller ---
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    public Mono<Order> create(@RequestBody CreateOrderRequest req) {
        return service.create(req.customerName());
    }

    @GetMapping("/{id}")
    public Mono<Order> get(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping(params = "status=PENDING")
    public Flux<Order> pending() {
        return service.findPending();
    }

    @PostMapping("/{id}/ship")
    public Mono<Order> ship(@PathVariable Long id) {
        return service.ship(id);
    }
}
```

Every layer returns `Mono` or `Flux`. The WebFlux server handles each request on an event-loop thread and releases it when the database responds.

**Primary sources:** [Spring Data R2DBC Reference](https://docs.spring.io/spring-data/r2dbc/docs/current/reference/html/) · [Project Reactor Reference](https://projectreactor.io/docs/core/release/reference/) · [R2DBC Specification](https://r2dbc.io/) · [Spring Boot R2DBC Guide](https://docs.spring.io/spring-boot/docs/current/reference/html/data.html#data.nosql.r2dbc)

## Check your understanding

<details>
<summary>1. What does ReactiveCrudRepository use as its ID type, and what does findById() return?</summary>
<p><strong>Correct answer:</strong> ID type is Long; findById returns Mono<order></order></p>
</details>

<details>
<summary>2. Which annotation maps a field to a database column in an R2DBC entity, and which package does it come from?</summary>
<p><strong>Correct answer:</strong> @Column from org.springframework.data.relational.core.mapping</p>
</details>

<details>
<summary>3. You call repo.save(order) on a new order with no @Id value. What does R2DBC do?</summary>
<p><strong>Correct answer:</strong> It inserts the row and returns a Mono<order> with the generated ID populated</order></p>
</details>

<details>
<summary>4. In a @Query method on an R2DBC repository, what query language do you write?</summary>
<p><strong>Correct answer:</strong> Native SQL against the target database, because R2DBC has no object query language</p>
</details>

<details>
<summary>5. Why does R2DBC not support @OneToMany or @ManyToOne relationships on entities?</summary>
<p><strong>Correct answer:</strong> R2DBC is not an ORM; it maps rows to objects without lazy-loading proxies, so relationships must be fetched as separate queries</p>
</details>
