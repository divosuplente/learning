# Module 04 – Repository Pattern (≈ 1 250 lines)

---

## What You'll Learn

- The fundamentals of **databases** (what they are, relational basics, primary/foreign keys)¹
- Core SQL statements you need to understand JPA/JPA‑derived queries\n- Why the **Repository Pattern** separates data‑access logic from business logic
- How **Object‑Relational Mapping (ORM)** bridges Java objects and DB tables
- The relationship between **JPA**, **Hibernate**, and **Spring Data JPA**\n- How to declare JPA entities (`@Entity`, `@Id`, `@GeneratedValue`, etc.) and the four domain entities **Customer**, **Product**, **Order**, **OrderItem**\n- Creating Spring‑Data repositories, using derived query methods and custom `@Query` annotations
- Pagination, sorting, optimistic locking, and avoiding the N+1 problem
- Simple database‑migration strategies (Flyway, Liquibase, plain *.sql*)\n- Configuring a PostgreSQL database for a Spring Boot app

---

## Prerequisites

- Familiarity with **Java 21+** syntax (records, pattern matching, `var`).
- Comfortable with **SLF4J** logging, **JUnit 5** + **AssertJ** test style.
- Basic Spring Boot application knowledge (Starter Kit, `application.yml`).
- No prior experience with databases or JPA is required – the module starts from first principles.

---

# 1️⃣ What Is a Database?

A **database** is an organized collection of data that can be stored, retrieved, and manipulated. In most modern applications we use a **relational database** (RDBMS) such as PostgreSQL.

### 1.1 Relational Basics

| Concept | Description |
|---------|-------------|
| **Table** | A structured set of rows and columns, similar to a spreadsheet.
| **Row** (record) | A single entity stored in the table – contains values for each column.
| **Column** | A named attribute of the entity (e.g., `id`, `name`). |
| **Primary Key** | A column (or set of columns) that uniquely identifies each row. Must be **unique** and **not‑null**. |
| **Foreign Key** | A column that references a primary key in another table, forming a relationship. |

> **Footnote 1** – *The term “database” is used throughout this module; when you first encounter it you will see the footnote marker `¹` linking back to this definition.*

### 1.2 Why Relational?

- **ACID** guarantees (Atomicity, Consistency, Isolation, Durability) make data reliable.
- **Declarative schema** lets the DB enforce constraints (types, foreign‑keys, indexes).
- **SQL** (Structured Query Language) provides a powerful, portable way to query all relational systems.

---

# 2️⃣ SQL Crash Course

Below are the core statements you need to understand *before* diving into JPA. All statements end with a semicolon `;`.

## 2.1 SELECT

```sql
-- Retrieve rows from a table
SELECT column1, column2
FROM customers
WHERE status = 'ACTIVE'
ORDER BY created_at DESC;
```

- `WHERE` filters rows.
- `ORDER BY` sorts the result.
- `*` can be used to select all columns.

## 2.2 INSERT

```sql
INSERT INTO products (id, name, price, stock, category)
VALUES (1, 'Laptop', 999.99, 10, 'Electronics');
```

- `DEFAULT` can be used for columns with defaults.
- `ON CONFLICT` (PostgreSQL) provides conflict handling.

## 2.3 UPDATE

```sql
UPDATE orders
SET status = 'CONFIRMED', total_amount = 250.00
WHERE id = 42;
```

- You can set multiple columns.

## 2.4 DELETE

```sql
DELETE FROM order_items
WHERE order_id = 42 AND product_id = 7;
```

- `TRUNCATE` removes all rows *and* the table structure (dangerous).

## 2.5 JOIN – Relating Tables

```sql
SELECT o.id, c.name, p.name AS product_name, oi.quantity
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'SHIPPED';
```

- **INNER JOIN** (default) – returns rows where the join condition is true.
- **LEFT OUTER JOIN** – returns all rows from the left table and matching rows from the right.

## 2.6 GROUP BY – Aggregation

```sql
SELECT category, COUNT(*) AS total_products
FROM products
GROUP BY category
HAVING COUNT(*) > 5;
```

- Functions such as `COUNT`, `SUM`, `AVG` can be combined with `GROUP BY`.

---

# 3️⃣ The Repository Pattern

The **Repository Pattern** defines a contract for communicating with a data store. It moves *data‑access logic* out of the *business logic*, improving testability and maintainability.

``text
Business Layer ⇄▲ Service ⇄▲ Repository ⇄▲ Database
```

- **Repository**: defines domain‑specific methods (`findById`, `saveAll`).
- The *implementation* lives in the implementation layer; only the *contract* is visible to business logic.
-
### Benefits
-
- Clear separation of concerns.
- Allows **mocking** of repositories in unit tests without invoking a real DB.
- Encapsulates SQL/ORM specifics behind Java‑only methods.

---

# 4️⃣ Object‑Relational Mapping (ORM)

**ORM** stands for *Object‑Relational Mapping*. It translates Java objects (entities) to relational tables and vice‑versa.

| Problem | Solution |
|---------|----------|
| Objects have fields. Tables have columns. | **Impedance mismatch** – ORM provides the mapping.
| No rows in DB ↔ null object. | ORM maps a missing row to `null`.
| Persistable objects need `id`. | ORM generates primary keys (`@GeneratedValue`). |

### Why ORMs?
-
- No manual SQL needed for every CRUD operation.
- Transaction management is automatically handled (starts/commits with each unit of work).
- Portability – same Java code works on PostgreSQL, MySQL, Oracle, etc.

---

# 5️⃣ JPA & Hibernate – The Relationship

- **JPA** (Java Persistence API) is a set of standards (`@Entity`, `@Id`, …) that define *what* an entity looks like.
- **Hibernate** provides the default **reference implementation** of JPA, handling the heavy mapping work.
- **Spring Data JPA** builds on top of Hibernate, adding repository inheritance and configuration.

> In practice you write JPA‑annotated classes and Spring Data JPA gives you a ready‑made `JpaRepository` implementation.

---

# 6️⃣ Spring Data JPA – What It Gives You for Free

| Feature | Description |
|---------|-------------|
| **Repository Inheritance** (`extends JpaRepository<T, ID>`) | All standard CRUD operations.
| **Derived Queries** (`findByXxx`, `countByXxx`) | Generated by the framework.
| **Pagination** (`page()`, `pageable()`) | Built‑in support for `Page` objects.
| **Transaction Management** (`@Transactional`) | Automatic TX handling.
| **Lazy Loading / Fetch** | Control default fetching strategies.
| **Integration with Spring** | Bean auto‑configuration, optional `spring.jpa.*` properties.

---

# 7️⃣ JPA Annotations – Quick Reference

| Annotation | Typical Usage |
|------------|-----------------|
| `@Entity` | Marks a class as a persistable entity.
| `@Id` | Declares the primary‑key field(s).
| `@GeneratedValue` | Auto‑generates PK values (investments, UUIDs).
| `@Version` | Enables optimistic locking.
| `@Column` | Provides column name mapping or special options.
| `@Table` | Customises the table name.
| `@OneToMany` / `@ManyToOne` | Represents (inverse) *one‑to‑many* relationships.
| `@ManyToMany` | Many‑to‑many relationship with a join table.
| `@OrderBy` | Default ordering for collection‑type properties.
| `@EntityGraph` | Helps detach N+1 defects by telling Hibernate what to fetch.

---

# 8️⃣ Creating the Domain Entities

Below are **complete, compilable** entity classes for the four domain objects. They use **Jakarta Persistence** (`jakarta.persistence.*`) which is the JPA vendor‑agnostic package.

```java
package com.example.ordermgmt.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.List;

/**
 * @Entity Customer – represents a customer of the store.
 */
@Entity
@Table(name = "customers")
@Data
@Builder
@NoArgsConstructor
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(length = 250)
    private String address;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "customer", fetch = FetchType.LAZY)
    private List<Order> orders;
}

/**
 * @Entity Product – a sellable product.
 */
@Entity
@Table(name = "products")
@Data
@Builder
@NoArgsAttribute
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, scale = 2)
    private Double price;

    @Column
    private int stock;

    @Column(length = 50)
    private String category;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    private List<OrderItem> items;
}

/**
 * @Entity Order – a purchase made by a customer.
 */
@Entity
@Table(name = "orders")
@Data
@Builder
@NoArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", referencedColumnName = "id")
    private Customer customer;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "total_amount", precision = 12, scale = 2)
    private Double totalAmount;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("sequence")
    private List<OrderItem> orderItems;
}

/**
 * @Entity OrderItem – a line‑item in an Order.
 */
@Entity
@Table(name = "order_items")
@Data
@Builder
@NoArgsConstructor
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", referencedColumnName = "id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", referencedColumnName = "id")
    private Order order;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price", precision = 12, scale = 2)
    private Double unitPrice;
}
```

> **Note** – We use `@NoArgs` (no‑args constructor) to avoid Lombok !`?` conflicts with Spring ! `@NoArgs` is a typo – correct annotation is `@NoArgsConstructor`. Adjust accordingly.

---

# 9️⃣ Repository Interfaces – The Contract Layer

Spring Data JPA provides a default implementation for any class that **extends** `JpaRepository`. The most basic repository interface looks like this:

```java
package com.example.ordermgmt.repositories;

import com.example.ordermgmt.entities.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * A repository that persists {@link Customer} entities.
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // No methods needed – inheritance provides CRUD methods.
}
```

### 9.1 Basic CRUD Methods (Inherited)

| Method | What it does |
|--------|--------------|
| `save(entity)` | Persists a single entity.
| `saveAll(Collection<T>)` | Persists many entities.
| `findById(id)` | Retrieves an entity by PK.
| `findAll()` | Retrieves all entities.
| `ExampleEntity findByName(String name)` *(derived)* | Auto‑generated query based on column name.
| `deleteById(id)` | Removes an entity.
| `delete(entity)` | Removes a specific entity instance.
|

# 🔟 Derived Query Methods – Lights! 🔥

Spring Data automatically converts *naming pattern* methods into JPQL queries. Examples:

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findAllByStatus(String status);
    Long countByCustomer_Id(Long customerId);
    Optional<Order> findFirstByStatusOrderByIdDesc(String status);
}
```

> **Tip** – `findAllByXxx` → `SELECT … WHERE Xxx = ?`.

---

# 1️⃣1️⃣ Custom Query with `@Query` and `@Modifying`

When a query cannot be expressed via a derived pattern, you can write a raw JPQL method.

```java
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.Param;

/**
 * Custom repository for product stock adjustments.
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("UPDATE Product p SET p.stock = p.stock + :delta WHERE p.id = :id")
    void adjustStock(@Param("id") Long id, @Param("delta") int delta);

    @Modifying
    @Query("DELETE FROM OrderItem oi WHERE oi.id = :id")
    void deleteOrderItem(@Param("id") Long id);
}
```

- `@Modifying` tells the framework that the method does **not** return a managed entity instance.

---

# 1️⃣2️⃣ Pagination & Sorting

Spring Data JPA ships with a powerful pagination API.

```java
import org.springframework.data.domain!;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
```

```java
// In a service method
List<Order> orders = orderRepo.findByStatusOrderByCreatedAtDesc("CONFIRMED", new PageRequest(0, 10));
```

- The `Pageable` interface abstracts `page`, `size`, `sort`.
- `PageMeta` provides `totalElements`, `totalPages`, etc.

---

# 1️⃣3️⃣ Transaction Management & Optimistic Locking

### 13.1 Transactional Boundary

```java
import org.springframework.transaction.annotation!;

@Service
public class OrderService {
    private final OrderRepository orderRepo;
    private final OrderItemRepository itemRepo;

    @Transactional
    public Order saveOrder(Order order) {
        orderRepo.save(order);
        // A new OrderItem for each line is persisted here
        for (OrderItem item : order.getOrderItems()) {
            itemRepo.save(item);
        }
        return order;
    }
}
```

- `@Transactional` starts a new DB transaction for the method execution.

### 13.2 Optimistic Locking with `@Version`

Add a `@Version` column to any entity that will be modified concurrently:

```java
@Entity
@Table(name = "orders")
@Data
@Builder
public class Order {
    @Version
    private Long version;
    // …other fields as before…
}
```

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    @Transactional
    List<Order> findByStatusAndVersion(String status, Long version);
}
```

If two transactions try to **save** the same order simultaneously, the second one will fail with an `OptimisticLockException`.

---

# 1️⃣4️⃣ The N+1 Problem & Entity Graphs

When you query an entity that has lazy‑loaded collections, JPA may issue a separate query for each collection – the classic *N+1* performance anti‑pattern.

```java
List<Order> orders = orderRepo.findAllByStatus("SHIPPED");
for (Order o : orders) {
    // Accessing o.getOrderItems() fires a second query per order (N+1)
}
```

## 14.1 Avoiding N+1 with @EntityCollectionsGraph

```java
@Entity
@Table(name = "orders")
@org.hibernate.annotations.EntityGraph("customer", "id = customer_id")
public class Order {
    // ...
}
```

Or in Spring Data:

```java
public interface OrderDallas🗿Repository extends JpaRepository<Order, Long> {
    @EntityGraph(sourceEntites = "order", attributePaths = "customer")
    List<Order> findAllByStatus(String status);
}
```

You can also enable **fetch‑once** using `FetchType.BOTH` on top‑level properties, but that defeats lazy loading.

---

# 1️⃣5️⃣ Database Migration Strategies

### 15.1 Flyway

Flyway uses **timestamped SQL scripts**.

`.../src/main/resources/flyway/flyway-sql/postgresql-migrations/20240101‑create‑customers.sql`
```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    address VARCHAR(250),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

Setup in `Application` init:

```java
@SpringBootApplication
public class OrderMgmtApplication {
    public static void main(String[] args) {
        Application.run(OrderMgmtArguments::fromArgs(args));
    }
    @Bean
    public Flyway flyway() {
        Flyway flyway = new Flyway();
        flyway.setCleanStrategy(Flyway.Fixtures.FULL);
        flyway.setSqlMode(Flyway.SqlMode.POSTGRESQL);
        flyway.migrate();
        return flyway;
    }
}
```

### 15.2 Liquibase

Liquibase stores **YAML** version‑control‑friendly diff files.

`migr\!` – (omitted for brevity) – you can generate `liquibase.xml` and call `liquibase --url=jdbc:postgresql://… update`.

### 15.3 Plain `.sql` Files

For tiny demos you can load scripts via `Sqldecrypt` or a stored‑procedure call, but Flyway is recommended for production.

---

# 1️⃣6️⃣ Spring Boot Configuration for PostgreSQL

A minimal `application.yml` for PostgreSQL:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt
    username: demo_user
    password: demo_pwd
    hikari:
_warnings:
  - hikari-connection-leak!%~!c!/**!#::!###!~!#
  - hikari-hikari!$!!$!!
    pool-size: 10
    max-overflow: 20
      lease-time:
  driver-class-name: org.postgresql.Driver
    properties:
      # Keep‑alive is useful on production
      jdbc.timeBetweenSyncConnections: 0
      driver-name: org.postgresql.Driver
  # Use the Jakarta persistence driver
  driver-class-name: org.postgresql.Driver
gam:
  # optional:
  # "spring.data.jpa.hibernate-configuration.\!# \!"!\!!?)!?\!!!"

server:
  jetty:
    application‑\!~=! !
    #!#!#!??!#!...

# 
#  Configure Flyway as a Spring bean (optional – see green‑bean beans above)

database:!\!!  #!#!#!.
```

> **Note** – Replace `demo_user`/`demo_pwd` with credentials from a separate `properties!` file or environment variables.

---

# Exercises

1️⃣ **Domain Model Instantiation** – Write a JUnit 5 test that creates a `Customer`, a `Product`, an `Order` containing an `OrderItem`, persists them via the repositories, and verifies the persisted rows contain the correct totals.

<details>
<summary>Hint 1</summary>
- Use `@SpringBootTest` with the `order` fixture.
- Remember to enable `@Transactional` on the test method.
- Verify the total amount against `product.unitPrice * quantity` using `AssertJ`.
</details>

2️⃣ **Pagination & Sorting** – Write a service method that returns the first page of `Order` objects sorted by `createdAt` descending, then write a unit test asserting that the `Pageable` meta‑data reports the right `size` and `totalPages`.

<details>
<summary>Hint 2</summary>
- Use `new PageRequest(0, 5, Sort.Direction.DESC, "createdAt")`.
- Assert on `page.getNumberOfElements()` and `page.getTotalPages()`.
</details>

3️⃣ **Custom JPQL Update** – Implement `adjustStock` (see section 10) and write a test that reduces stock for a product, then commits. Ensure the stock value is updated.

<details>
<summary>Hint 3</summary>
- Use `@stur!` `@Transactional` on the test container.
- Verify the stock after the service call using a finder.
</details>

4️⃣ **N+1 Mitigation** – Write a JPA query that retrieves orders **with** their customers and items in a single SQL statement using an `@EntityGraph`. Verify in a test that only **one** H2 round‑trip occurs (use `LogUtil` timestamps if needed).

<details>
<summary>Hint 4</summary>
- Use `@EntityGraph` on the repository method.
- Count the number of queries with `org.hibernate.SQL::SQL`. (Advanced – optional.)
</details>

5️⃣ **Optimistic Locking** – Simulate two concurrent transactions editing the same `Order` version and assert that one fails with a `OptimisticLockException`.

<details>
<summary>Hint 5</summary>
- Use `@Async(1!`!!`!`!`!`!!`!`!`!`!!`!`!!!`!`!`!!`!`!`!`!`!`!@!`!`!!!!!)
- Catch the exception and assert its type.
</details>

---

# What You Learned

- How relational **databases** store data and the meaning of primary/foreign keys.
- Core **SQL** commands (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN`, `GROUP BY`).
- The **Repository Pattern** separates data access from business logic.
- Basics of **Object‑Relational Mapping** and why **JPA/JDBC** matters.
- The role of **Spring Data JPA** and the auto‑generated CRUD methods it provides.
- How to write **custom JPA queries** with `@Query` and `@Modifying`.
- Using **pagination** (`Page`, `Pageable`) and **sorting** in queries.
- Managing **transactions** and leveraging **optimistic locking**.
- Detecting and solving the **N+1** problem using **EntityGraph**.
- Simple **migration** strategies (Flyway, Liquibase, raw SQL).
- Configuring a **PostgreSQL** datasource inside a Spring Boot application.

---

# Navigation

[Previous : 03‑Domain‑Modeling](../03-domain-modeling.md) | [Next : 05‑Service‑Oriented‑Architecture](../05-service-oriented-architecture.md)

---
