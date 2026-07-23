# Module 04: Repository Pattern

## What You'll Learn

- How the Repository Pattern separates data access from business logic
- SQL fundamentals as they relate to JPA query generation
- What the Repository Pattern is and why it separates data access from business logic
- Object-Relational Mapping (ORM) and the impedance mismatch between objects and tables
- JPA and Hibernate: what they are and how they relate
- Spring Data JPA: what it gives you for free
- JPA entities: `@Entity`, `@Id`, `@GeneratedValue`, `@Column`, `@Table`, relationship annotations
- Creating entity classes for Customer, Product, Order, and OrderItem
- Spring Data repositories: `JpaRepository` interface and derived query methods
- Custom queries with `@Query`
- Pagination and sorting in repositories
- The N+1 problem and how to fix it
- Configuring PostgreSQL with Spring Boot

## Prerequisites

- [Module 00: Java for Experienced Developers](./00-java-foundations.md) — you understand Java classes, records, collections
- [Module 01: Build Tools & Project Setup](./01-build-tools-and-project-setup.md) — you have a Spring Boot project
- [Module 02: Dependency Injection](./02-dependency-injection.md) — you understand beans and constructor injection
- [Module 03: Spring Boot Fundamentals](./03-spring-boot-fundamentals.md) — you understand `application.yml` and REST controllers

---

<details>
<summary>Table of Contents</summary>

- [What You'll Learn](#what-youll-learn)
- [Prerequisites](#prerequisites)
- [1. What Is a Database?](#1-what-is-a-database)
  - [Relational Databases](#relational-databases)
  - [Key Concepts](#key-concepts)
  - [Relationships](#relationships)
- [2. SQL Crash Course](#2-sql-crash-course)
  - [SELECT — Read Data](#select-read-data)
  - [INSERT — Create Data](#insert-create-data)
  - [UPDATE — Modify Data](#update-modify-data)
  - [DELETE — Remove Data](#delete-remove-data)
  - [JOIN — Combine Data from Multiple Tables](#join-combine-data-from-multiple-tables)
  - [What JPA Does](#what-jpa-does)
- [3. What Is the Repository Pattern?](#3-what-is-the-repository-pattern)
  - [Without Repository Pattern](#without-repository-pattern)
  - [With Repository Pattern](#with-repository-pattern)
- [4. ORM, JPA, and Hibernate](#4-orm-jpa-and-hibernate)
  - [ORM (Object-Relational Mapping)](#orm-object-relational-mapping)
  - [JPA (Java Persistence API)](#jpa-java-persistence-api)
  - [Hibernate](#hibernate)
  - [Spring Data JPA](#spring-data-jpa)
- [5. JPA Entities](#5-jpa-entities)
  - [Entity Anatomy](#entity-anatomy)
  - [Key Annotations](#key-annotations)
  - [Why Not Records?](#why-not-records)
- [6. Creating All Domain Entities](#6-creating-all-domain-entities)
  - [ProductEntity](#productentity)
  - [OrderStatus Enum](#orderstatus-enum)
  - [OrderEntity](#orderentity)
  - [OrderItemEntity](#orderitementity)
  - [Understanding Relationships](#understanding-relationships)
- [7. Spring Data Repositories](#7-spring-data-repositories)
  - [CustomerRepository](#customerrepository)
  - [ProductRepository](#productrepository)
  - [OrderRepository](#orderrepository)
  - [What Does JpaRepository Give You for Free?](#what-does-jparepository-give-you-for-free)
  - [Derived Query Methods](#derived-query-methods)
- [8. Pagination and Sorting in Repositories](#8-pagination-and-sorting-in-repositories)
- [9. The N+1 Problem](#9-the-n1-problem)
  - [The Problem](#the-problem)
  - [Solution 1: JOIN FETCH](#solution-1-join-fetch)
  - [Solution 2: @EntityGraph](#solution-2-entitygraph)
- [10. Configuring PostgreSQL](#10-configuring-postgresql)
  - [application.yml (already set up in Module 01)](#applicationyml-already-set-up-in-module-01)
  - [What ddl-auto Does](#what-ddl-auto-does)
  - [Using BigDecimal in PostgreSQL](#using-bigdecimal-in-postgresql)
- [What You Learned](#what-you-learned)
- [11. JPA Entity Relationships Deep Dive](#11-jpa-entity-relationships-deep-dive)
  - [One-to-One](#one-to-one)
  - [Cascade Types](#cascade-types)
  - [Fetch Strategies](#fetch-strategies)
  - [The N+1 Problem (Recap with Solution)](#the-n1-problem-recap-with-solution)
- [12. JPQL and Native Queries](#12-jpql-and-native-queries)
  - [JPQL (Java Persistence Query Language)](#jpql-java-persistence-query-language)
  - [Native SQL Queries](#native-sql-queries)
  - [Pagination and Sorting](#pagination-and-sorting)
- [13. Database Indexing and Performance](#13-database-indexing-and-performance)
  - [Adding Indexes](#adding-indexes)
  - [When to Index](#when-to-index)
  - [Common Performance Issues](#common-performance-issues)
- [14. Flyway Database Migrations](#14-flyway-database-migrations)
  - [Adding Flyway](#adding-flyway)
  - [Migration Files](#migration-files)
  - [How Flyway Works](#how-flyway-works)
  - [Flyway Configuration](#flyway-configuration)
  - [Why Flyway Over ddl-auto](#why-flyway-over-ddl-auto)
- [15. Testing JPA Repositories with Testcontainers](#15-testing-jpa-repositories-with-testcontainers)
  - [What Is Testcontainers?](#what-is-testcontainers)
  - [Setup](#setup)
  - [Full Repository Test](#full-repository-test)
  - [@ServiceConnection](#serviceconnection)

</details>

## 1. Databases & Relational Concepts (Quick Refresher)

A **database** is organized storage for your application's data. When your application shuts down, the data in memory (variables, objects) disappears. A database persists data — it saves it to disk so it survives restarts.

### Relational Databases

The most common type of database is a **relational database** (RDBMS). It stores data in **tables** — think of a table as a spreadsheet:

**customers table:**
| id | name | email | address |
|----|------|-------|---------|
| 1 | Alice | alice@example.com | 123 Main St |
| 2 | Bob | bob@example.com | 456 Oak Ave |

**products table:**
| id | name | price | stock | category |
|----|------|-------|-------|----------|
| 1 | Widget | 19.99 | 100 | Electronics |
| 2 | Gadget | 49.99 | 50 | Electronics |
| 3 | Book | 14.99 | 200 | Media |

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Table** | A structured collection of rows and columns (like a spreadsheet) |
| **Row** | A single record (one customer, one product) |
| **Column** | A named attribute (name, email, price) |
| **Primary Key** | A column that uniquely identifies each row (usually `id`) |
| **Foreign Key** | A column that references a primary key in another table, creating a relationship |

### Relationships

Tables relate to each other:

- A **customer** can have many **orders** (one-to-many)
- An **order** belongs to one **customer** (many-to-one)
- An **order** has many **order items** (one-to-many)
- An **order item** references one **product** (many-to-one)

```
Customer 1 ────< Order 1 ────< OrderItem >──── 1 Product
                                        >──── 1 Product
```

We use **PostgreSQL** — a powerful, open-source relational database.

---

## 2. SQL Crash Course

**SQL (Structured Query Language)** is the language used to interact with relational databases. You don't need to be a SQL expert — that's what JPA does for you. But understanding the basics helps you understand what JPA does behind the scenes.

### SELECT — Read Data

```sql
-- Get all customers
SELECT * FROM customers;

-- Get a specific customer
SELECT * FROM customers WHERE id = 1;

-- Get only name and email
SELECT name, email FROM customers WHERE id = 1;
```

### INSERT — Create Data

```sql
INSERT INTO customers (name, email, address)
VALUES ('Charlie', 'charlie@example.com', '789 Pine St');
```

### UPDATE — Modify Data

```sql
UPDATE customers SET address = '999 New St' WHERE id = 1;
```

### DELETE — Remove Data

```sql
DELETE FROM customers WHERE id = 1;
```

### JOIN — Combine Data from Multiple Tables

```sql
-- Get orders with customer names
SELECT o.id, o.status, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

### What JPA Does

JPA generates SQL for you. Instead of writing `SELECT * FROM customers WHERE id = 1`, you call `customerRepository.findById(1L)` and JPA generates the SQL automatically.

---

## 3. What Is the Repository Pattern?

The **Repository Pattern** separates data access logic from business logic. Instead of writing SQL queries scattered throughout your application, you put all data access in one place — the **repository**.

### Without Repository Pattern

```java
// BAD — SQL everywhere
public class OrderService {
    public Order createOrder(...) {
        Connection conn = DriverManager.getConnection("jdbc:postgresql://...");
        PreparedStatement stmt = conn.prepareStatement(
            "INSERT INTO orders (customer_id, status) VALUES (?, ?)");
        stmt.setLong(1, customerId);
        stmt.setString(2, "PENDING");
        stmt.executeUpdate();
        // ... more SQL scattered everywhere
    }
}
```

### With Repository Pattern

```java
// GOOD — clean data access
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderResponse createOrder(...) {
        OrderEntity order = new OrderEntity();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order); // JPA generates the INSERT
        return OrderResponse.from(order);
    }
}
```

The service doesn't know SQL — it just tells the repository "save this" and "find that." The repository translates these calls into SQL.

---

## 4. ORM, JPA, and Hibernate

### ORM (Object-Relational Mapping)

Java works with **objects**. Databases work with **tables and rows**. There's a mismatch:

- Java object: `Order` has a `Customer` field (a reference to another object)
- Database: `orders` table has a `customer_id` column (a number, a foreign key)

**ORM** bridges this gap. It maps Java objects to database tables automatically:
- `order.getCustomer()` → SQL JOIN to fetch the customer
- `orderRepository.save(order)` → INSERT into orders table

### JPA (Java Persistence API)

**JPA** is a specification (a set of interfaces) for ORM in Java. It defines annotations like `@Entity`, `@Id`, `@OneToMany` and the `EntityManager` interface. JPA itself doesn't do anything — it's just a contract.

### Hibernate

**Hibernate** is the most popular **implementation** of JPA. It's the engine that actually does the work — it converts JPA annotations into SQL and executes it against the database.

### Spring Data JPA

**Spring Data JPA** is a Spring module that makes JPA even easier. It provides the `JpaRepository` interface — you just define an interface and Spring Data generates the implementation automatically at runtime.

```
Your Code → Spring Data JPA (interface) → JPA/Hibernate → SQL → PostgreSQL
```

---

## 5. JPA Entities

A **JPA entity** is a Java class that maps to a database table. Each instance of the class represents a row in the table.

### Entity Anatomy

```java
@Entity                          // Marks this class as a JPA entity
@Table(name = "customers")       // Maps to the "customers" table
public class CustomerEntity {

    @Id                          // This field is the primary key
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // Auto-increment
    @Column(name = "id")         // Maps to the "id" column
    private Long id;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "address")
    private String address;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // Required by JPA — must have a no-argument constructor
    protected CustomerEntity() {}

    public CustomerEntity(String name, String email, String address) {
        this.name = name;
        this.email = email;
        this.address = address;
        this.createdAt = Instant.now();
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

### Key Annotations

| Annotation | Purpose |
|------------|---------|
| `@Entity` | Marks the class as a JPA entity (maps to a table) |
| `@Table(name = "x")` | Specifies the table name (optional — defaults to class name) |
| `@Id` | Marks a field as the primary key |
| `@GeneratedValue` | Auto-generates the primary key value (auto-increment) |
| `@Column(name = "x")` | Maps a field to a specific column |
| `@OneToMany` | One entity has many of another (e.g., one customer, many orders) |
| `@ManyToOne` | Many entities reference one (e.g., many orders, one customer) |
| `@JoinColumn(name = "x")` | Specifies the foreign key column name |
| `@Table(name = "x")` | Overrides the default table name |

### Why Not Records?

JPA entities **cannot be records** because JPA expects to:
1. Create instances with a no-argument constructor
2. Set fields via setters (or field access)
3. Use lazy-loading proxies (which require subclassing)

Records are immutable and final — they can't be subclassed or modified. So entities use traditional classes with getters and setters. We use records for DTOs (which don't need persistence).

---

## 6. Creating All Domain Entities

### ProductEntity

```java
package com.example.ordermgmt.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
public class ProductEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private int stock;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected ProductEntity() {}

    public ProductEntity(String name, BigDecimal price, int stock, String category) {
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.category = category;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

### OrderStatus Enum

```java
package com.example.ordermgmt.domain;

public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED
}
```

### OrderEntity

```java
package com.example.ordermgmt.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerEntity customer;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItemEntity> items = new ArrayList<>();

    protected OrderEntity() {}

    public OrderEntity() {
        this.status = OrderStatus.PENDING;
        this.totalAmount = BigDecimal.ZERO;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public CustomerEntity getCustomer() { return customer; }
    public void setCustomer(CustomerEntity customer) { this.customer = customer; }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public List<OrderItemEntity> getItems() { return items; }
    public void setItems(List<OrderItemEntity> items) { this.items = items; }
}
```

### OrderItemEntity

```java
package com.example.ordermgmt.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    protected OrderItemEntity() {}

    public OrderEntity getOrder() { return order; }
    public void setOrder(OrderEntity order) { this.order = order; }

    public ProductEntity getProduct() { return product; }
    public void setProduct(ProductEntity product) { this.product = product; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
}
```

### Understanding Relationships

```
CustomerEntity  1 ───< OrderEntity  1 ───< OrderItemEntity  >─── 1  ProductEntity
                 │                    │                                │
            @ManyToOne             @ManyToOne                      @ManyToOne
            (from Order)          (from OrderItem)               (from OrderItem)
```

- `@ManyToOne` — many orders belong to one customer. The foreign key is on the "many" side (the `orders` table has `customer_id`).
- `@OneToMany(mappedBy = "order")` — one order has many items. `mappedBy = "order"` means the relationship is defined by the `order` field on `OrderItemEntity`. You don't need a separate foreign key — it's already there.
- `cascade = CascadeType.ALL` — when you save an order, all its items are saved automatically.
- `orphanRemoval = true` — when you remove an item from the list, it's deleted from the database.
- `fetch = FetchType.LAZY` — the related entity is loaded only when accessed (not when the order is loaded). This avoids unnecessary queries.

---

## 7. Spring Data Repositories

Spring Data JPA provides the `JpaRepository` interface. You only define the interface — Spring generates the implementation at runtime.

### CustomerRepository

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.CustomerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {

    // Derived query method — Spring generates the SQL automatically
    // SELECT * FROM customers WHERE email = ?
    Optional<CustomerEntity> findByEmail(String email);

    // SELECT * FROM customers WHERE name LIKE ?
    // The % wildcards must be in the argument, not the method name
    // findByEmail method already above
}
```

### ProductRepository

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<ProductEntity, Long> {

    // Derived query method
    // SELECT * FROM products WHERE category = ?
    List<ProductEntity> findByCategory(String category);

    // SELECT * FROM products WHERE stock < ?
    List<ProductEntity> findByStockLessThan(int threshold);

    // SELECT * FROM products WHERE name CONTAINS ? (case-insensitive)
    List<ProductEntity> findByNameContainingIgnoreCase(String name);
}
```

### OrderRepository

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    // Derived query method
    // SELECT * FROM orders WHERE customer_id = ?
    List<OrderEntity> findByCustomerId(Long customerId);

    // Derived query method with multiple conditions
    // SELECT * FROM orders WHERE customer_id = ? AND status = ?
    List<OrderEntity> findByCustomerIdAndStatus(Long customerId, OrderStatus status);

    // Custom JPQL query (when derived methods aren't enough)
    // @Query uses JPQL (Java Persistence Query Language) — like SQL but for entities
    @Query("SELECT o FROM OrderEntity o WHERE o.status = :status ORDER BY o.createdAt DESC")
    List<OrderEntity> findOrdersByStatusOrdered(@Param("status") OrderStatus status);

    // Native SQL query (when you need database-specific features)
    @Query(value = "SELECT * FROM orders WHERE total_amount > :amount",
           nativeQuery = true)
    List<OrderEntity> findHighValueOrders(@Param("amount") java.math.BigDecimal amount);
}
```

### What Does `JpaRepository` Give You for Free?

Without writing any implementation, `JpaRepository` gives you:

| Method | What It Does |
|--------|-------------|
| `save(entity)` | INSERT or UPDATE the entity |
| `findById(id)` | Find one entity by its ID |
| `findAll()` | Get all entities |
| `findAll(Pageable)` | Get a page of entities (pagination) |
| `deleteById(id)` | Delete an entity by ID |
| `delete(entity)` | Delete a specific entity |
| `count()` | Count all entities |
| `existsById(id)` | Check if an entity exists by ID |

### Derived Query Methods

Spring Data can generate queries from method names:

| Method Name | Generated SQL |
|-------------|---------------|
| `findByName(String name)` | `WHERE name = ?` |
| `findByEmailAndName(String email, String name)` | `WHERE email = ? AND name = ?` |
| `findByStockLessThan(int n)` | `WHERE stock < ?` |
| `findByCategoryOrderByPriceDesc(String cat)` | `WHERE category = ? ORDER BY price DESC` |
| `findByCreatedAtAfter(Instant date)` | `WHERE created_at > ?` |
| `findByNameContaining(String text)` | `WHERE name LIKE '%text%'` |

**Rules:**
- Method must start with `findBy`, `existsBy`, `countBy`, or `deleteBy`
- Field names must match the entity's field names exactly
- Conditions are connected with `And`, `Or`
- Sorting is added with `OrderByFieldNameAsc` or `OrderByFieldNameDesc`

---

## 8. Pagination and Sorting in Repositories

```java
// In the repository interface:
Page<ProductEntity> findAll(Pageable pageable);

// In the service:
Pageable pageable = PageRequest.of(0, 20, Sort.by("price").ascending());
Page<ProductEntity> page = productRepository.findAll(pageable);

page.getContent();          // List of products on this page
page.getTotalElements();    // Total count of all products
page.getTotalPages();       // Total number of pages
page.getNumber();           // Current page number (0-based)
page.hasNext();             // Is there a next page?
page.hasPrevious();         // Is there a previous page?
```

---

## 9. The N+1 Problem

The **N+1 problem** is a common performance issue with JPA. It happens when you fetch a list of entities and then access their relationships.

### The Problem

```java
// 1 query: fetch 10 orders
List<OrderEntity> orders = orderRepository.findAll();
// SELECT * FROM orders LIMIT 10

for (OrderEntity order : orders) {
    // N queries: one per order to fetch the customer
    String customerName = order.getCustomer().getName();
    // SELECT * FROM customers WHERE id = ?
}
```

**1 query for orders + 10 queries for customers = 11 queries!** This is very slow for hundreds of orders.

### Solution 1: JOIN FETCH

Use `@Query` with `JOIN FETCH` to fetch related data in a single query:

```java
@Query("SELECT o FROM OrderEntity o JOIN FETCH o.customer WHERE o.status = :status")
List<OrderEntity> findByStatusWithCustomer(@Param("status") OrderStatus status);
```

This generates a single SQL query with a JOIN:
```sql
SELECT o.*, c.* FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = ?
```

**11 queries → 1 query.**

### Solution 2: @EntityGraph

```java
@EntityGraph(attributePaths = {"customer", "items", "items.product"})
@Query("SELECT o FROM OrderEntity o WHERE o.status = :status")
List<OrderEntity> findByStatusWithAllRelations(@Param("status") OrderStatus status);
```

`@EntityGraph` tells JPA to fetch the specified relationships eagerly (in one query) without writing the JOIN in the query.

---

## 10. Configuring PostgreSQL

### application.yml (already set up in Module 01)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ordermgmt
    username: postgres
    password: postgres
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: update      # Creates/updates tables automatically
    show-sql: true           # Print SQL statements in console
    properties:
      hibernate:
        format_sql: true     # Pretty-print SQL
```

### What `ddl-auto` Does

| Value | What It Does |
|-------|-------------|
| `update` | Creates tables that don't exist and adds columns that don't exist. Does NOT drop or modify existing columns. Good for development. |
| `create` | Drops all tables and recreates them on every startup. Good for testing, destroys data. |
| `create-drop` | Same as `create`, but also drops tables when the application stops. |
| `validate` | Checks if the schema matches the entities (no changes). Use in production. |
| `none` | Does nothing. Use in production with Flyway or Liquibase for migrations. |

### Using BigDecimal in PostgreSQL

PostgreSQL has a `NUMERIC` type that maps perfectly to Java's `BigDecimal`. We use `precision` and `scale` on `@Column`:

```java
@Column(precision = 10, scale = 2)
private BigDecimal price;
```

- `precision = 10` — up to 10 digits total
- `scale = 2` — 2 digits after the decimal point
- Maps to `NUMERIC(10, 2)` in PostgreSQL — always use BigDecimal for money

---

## What You Learned

- A **database** stores data persistently in **tables** (rows and columns)
- **SQL** is the language for databases — JPA generates it for you
- The **Repository Pattern** separates data access (repositories) from business logic (services)
- **ORM** (via JPA/Hibernate) maps Java objects to database tables
- **Spring Data JPA** generates repository implementations from interfaces — you just declare the interface
- **JPA entities** use `@Entity`, `@Id`, `@GeneratedValue`, `@Column`, and relationship annotations — they are traditional classes (not records) with getters and setters
- **Relationships**: `@ManyToOne` (many-to-one, foreign key on the "many" side), `@OneToMany(mappedBy = ...)` (one-to-many, the other side owns the relationship)
- **Derived query methods** let you write queries as method names: `findByEmail()`, `findByCategoryAndStockGreaterThan()`
- **`@Query`** with JPQL handles complex queries, and `JOIN FETCH` solves the N+1 problem
- **BigDecimal** with `@Column(precision = 10, scale = 2)` maps to PostgreSQL `NUMERIC` — always use BigDecimal for money, never `double`
- **`ddl-auto: update`** auto-creates tables for development; use `validate` or Flyway in production

---

## 11. JPA Entity Relationships Deep Dive

### One-to-One

```java
@Entity
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // An order has exactly one shipping address
    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "shipping_address_id")
    private ShippingAddress shippingAddress;
}

@Entity
public class ShippingAddress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String street;
    private String city;
    private String zipCode;
}
```

### Cascade Types

| Cascade | Effect |
|---------|--------|
| `PERSIST` | Saving the parent also saves the child |
| `MERGE` | Merging the parent also merges the child |
| `REMOVE` | Deleting the parent also deletes the child |
| `ALL` | All of the above |
| `REFRESH` | Refreshing the parent also refreshes the child |
| `DETACH` | Detaching the parent also detaches the child |

### Fetch Strategies

| Strategy | When It Loads | Use Case |
|----------|---------------|----------|
| `EAGER` | Immediately when parent is loaded | Small, always-needed associations |
| `LAZY` (default for @OneToMany, @ManyToOne) | Only when accessed | Large or optional associations |

```java
// BAD — loads every order item even when you only need the order header
@OneToMany(mappedBy = "order", fetch = FetchType.EAGER)
private List<OrderItem> items;

// GOOD — loads items only when .getItems() is called
@OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
private List<OrderItem> items;
```

### The N+1 Problem (Recap with Solution)

```java
// This triggers 1 query for orders + N queries for items (N+1 problem)
List<Order> orders = orderRepository.findAll();
for (Order order : orders) {
    System.out.println(order.getItems().size());  // triggers a query per order!
}

// Solution: JOIN FETCH in the repository
@Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items")
List<Order> findAllWithItems();  // single query
```

---

## 12. JPQL and Native Queries

### JPQL (Java Persistence Query Language)

JPQL looks like SQL but operates on **entities**, not tables:

```java
@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    // JPQL — uses entity names and field names (not table/column names)
    @Query("SELECT o FROM OrderEntity o WHERE o.status = :status AND o.createdAt > :after")
    List<OrderEntity> findRecentByStatus(@Param("status") OrderStatus status,
                                          @Param("after") Instant after);

    // JPQL with JOIN FETCH to solve N+1
    @Query("SELECT DISTINCT o FROM OrderEntity o LEFT JOIN FETCH o.items WHERE o.status = :status")
    List<OrderEntity> findByStatusWithItems(@Param("status") OrderStatus status);

    // JPQL aggregate
    @Query("SELECT SUM(o.totalAmount) FROM OrderEntity o WHERE o.status = 'CONFIRMED'")
    BigDecimal getTotalConfirmedRevenue();
}
```

### Native SQL Queries

When JPQL can't express what you need:

```java
@Query(value = "SELECT * FROM orders WHERE EXTRACT(MONTH FROM created_at) = :month",
       nativeQuery = true)
List<OrderEntity> findByMonth(@Param("month") int month);
```

### Pagination and Sorting

```java
// Spring Data provides Pageable — no need to write pagination logic
Page<OrderEntity> findByStatus(OrderStatus status, Pageable pageable);

// Usage
Pageable pageable = PageRequest.of(0, 20, Sort.by("createdAt").descending());
Page<OrderEntity> page = orderRepository.findByStatus(OrderStatus.PENDING, pageable);

page.getContent();       // list of orders on this page
page.getTotalElements(); // total count
page.getTotalPages();   // total page count
page.hasNext();         // is there a next page?
```

---

## 13. Database Indexing and Performance

### Adding Indexes

```java
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_status", columnList = "status"),
    @Index(name = "idx_order_customer_status", columnList = "customer_id, status"),
    @Index(name = "idx_order_created_at", columnList = "created_at")
})
public class OrderEntity { ... }
```

### When to Index

| Column | Index? | Why |
|--------|--------|-----|
| Primary key | Yes (automatic) | O(1) lookup by ID |
| Foreign keys | Yes | JOIN performance |
| Frequently filtered columns | Yes | WHERE clause speed |
| Frequently sorted columns | Yes | ORDER BY speed |
| Rarely queried columns | No | Indexes slow down writes |
| Low cardinality (boolean) | Usually no | Index doesn't help much |

### Common Performance Issues

```java
// BAD — can't use index on UPPER(name)
@Query("SELECT p FROM ProductEntity p WHERE UPPER(p.name) = UPPER(:name)")
ProductEntity findByNameIgnoreCase(@Param("name") String name);

// GOOD — use ILIKE or store a normalized column
@Query("SELECT p FROM ProductEntity p WHERE LOWER(p.name) = LOWER(:name)")
ProductEntity findByNameIgnoreCase(@Param("name") String name);
```

---

## 14. Flyway Database Migrations

In production, you should **never** use `ddl-auto: update`. Instead, use a
migration tool like **Flyway** to manage schema changes in version control.

### Adding Flyway

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

### Migration Files

```
src/main/resources/db/migration/
├── V1__create_tables.sql
├── V2__add_index_on_orders.sql
├── V3__add_shipping_address_table.sql
└── V4__add_audit_log_table.sql
```

**V1__create_tables.sql:**
```sql
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    address VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL
);
```

**V2__add_index_on_orders.sql:**
```sql
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
```

### How Flyway Works

1. On application startup, Flyway checks the `flyway_schema_history` table
2. It compares migration files against the table
3. Unexecuted migrations are run **in order** (V1, V2, V3...)
4. Each migration is wrapped in a transaction — all or nothing

### Flyway Configuration

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true  # allow running on an existing database
    validate-on-migrate: true   # verify checksums of applied migrations
```

### Why Flyway Over ddl-auto

| `ddl-auto: update` | Flyway |
|---------------------|--------|
| Updates schema silently | Migrations are explicit and versioned |
| Can't roll back changes | Each migration is a file you can review |
| No history of changes | Full audit trail in `flyway_schema_history` |
| Unpredictable in production | Deterministic — same migrations every time |
| Can't add data migrations | V3 can include INSERT/UPDATE statements |

---

## 15. Testing JPA Repositories with Testcontainers

### What Is Testcontainers?

Testcontainers is a Java library that **starts real Docker containers** during
tests. Instead of an in-memory H2 database that doesn't match production, you
test against a real PostgreSQL instance.

### Setup

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

### Full Repository Test

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryFullTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Autowired
    private OrderRepository orderRepo;
    @Autowired
    private CustomerRepository customerRepo;
    @Autowired
    private ProductRepository productRepo;

    @Test
    void findByStatus_returnsOnlyMatchingOrders() {
        // Arrange
        var customer = customerRepo.save(
                new CustomerEntity("Alice", "alice@test.com", "123 Main"));

        var product = productRepo.save(
                new ProductEntity("Mug", new BigDecimal("9.99"), 50, "Kitchen"));

        var pendingOrder = new OrderEntity();
        pendingOrder.setCustomer(customer);
        orderRepo.save(pendingOrder);

        var confirmedOrder = new OrderEntity();
        confirmedOrder.setCustomer(customer);
        confirmedOrder.setStatus(OrderStatus.CONFIRMED);
        orderRepo.save(confirmedOrder);

        // Act
        List<OrderEntity> pendingOrders = orderRepo.findByStatus(OrderStatus.PENDING);

        // Assert
        assertThat(pendingOrders).hasSize(1);
        assertThat(pendingOrders.get(0).getStatus()).isEqualTo(OrderStatus.PENDING);
    }

    @Test
    void save_withItems_cascadesCorrectly() {
        var customer = customerRepo.save(
                new CustomerEntity("Bob", "bob@test.com", "456 Oak"));

        var product = productRepo.save(
                new ProductEntity("Book", new BigDecimal("24.99"), 100, "Education"));

        var order = new OrderEntity();
        order.setCustomer(customer);

        var item = new OrderItemEntity();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(2);
        item.setUnitPrice(product.getPrice());
        order.getItems().add(item);

        order.recalculateTotal();
        var saved = orderRepo.save(order);

        // Assert cascade — item was saved with the order
        var retrieved = orderRepo.findById(saved.getId()).orElseThrow();
        assertThat(retrieved.getItems()).hasSize(1);
        assertThat(retrieved.getTotalAmount())
                .isEqualByComparingTo(new BigDecimal("49.98"));
    }
}
```

### @ServiceConnection

Spring Boot 3.1+ introduced `@ServiceConnection` — it automatically wires the
container's database URL, username, and password into your Spring configuration.
No need for `@DynamicPropertySource` boilerplate.

---



---
← [Previous: Module 03 — Spring Boot Fundamentals](./03-spring-boot-fundamentals.md) | [Next: Module 05 — Service-Oriented Architecture](./05-service-oriented-architecture.md) →