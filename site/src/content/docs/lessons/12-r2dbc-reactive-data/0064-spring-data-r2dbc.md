---
title: "Spring Data R2DBC Repositories"
description: "Spring Data R2DBC Repositories"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/12-r2dbc-reactive-data/0064-spring-data-r2dbc.md
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

## Reactive CRUD Operations

Every repository method returns `Mono` or `Flux`. Nothing executes until subscription — WebFlux handles this automatically when these types are returned from controller handlers.

```
// save: insert if no @Id, update if @Id present; returns Mono<Order> with DB-generated ID
repo.save(new Order("Alice", "PENDING", LocalDateTime.now()));

// find: empty Mono when no match; chain switchIfEmpty for errors or defaults
repo.findById(id).switchIfEmpty(Mono.error(new OrderNotFoundException(id)));

// derived query returns Flux<Order>
repo.findByStatus("PENDING");

// deleteById returns Mono<Void>
repo.deleteById(id);

// conditional update: find, mutate, save, then discard emissions
repo.findByCustomerNameAndStatus("Alice", "PENDING")
    .flatMap(order -> { order.setStatus("CANCELLED"); return repo.save(order); })
    .then(); // discards values, returns Mono<Void> on completion
```

## Primary sources

[Spring Data R2DBC Reference](https://docs.spring.io/spring-data/r2dbc/docs/current/reference/html/) · [Project Reactor Reference](https://projectreactor.io/docs/core/release/reference/) · [R2DBC Specification](https://r2dbc.io/) · [Spring Boot R2DBC Guide](https://docs.spring.io/spring-boot/docs/current/reference/html/data.html#data.nosql.r2dbc)

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
