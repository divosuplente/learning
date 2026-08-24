---
title: "ORM, JPA, Hibernate — The Stack Explained"
description: "ORM, JPA, Hibernate — The Stack Explained"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/04-repository-pattern/0026-orm-jpa-hibernate.md
---

# ORM, JPA, Hibernate: The Stack Explained

Java thinks in objects. Databases think in tables and rows. Something has to translate between these two worlds, and the ORM layer fills that role. This lesson untangles the four pieces you'll see in every Spring Data project: the concept (ORM), the spec (JPA), the engine (Hibernate), and the convenience layer (Spring Data JPA). Understanding which piece does what saves you from debugging the wrong abstraction.

## The Impedance Mismatch

Object-oriented languages and relational databases model data differently. This gap is called the **object-relational impedance mismatch**:

| Object World | Relational World |
| --- | --- |
| Objects with references to other objects | Rows with foreign-key integers |
| Inheritance hierarchies | Flat tables (no polymorphism) |
| Collections (`List<OrderItem>`) | Join tables or foreign keys |
| Identity by object reference | Identity by primary-key value |
| Navigation: `order.getCustomer()` | JOIN queries |

Consider a simple model:

```
// Java — order holds a reference to a Customer object
class Order {
    Customer customer;   // object reference
    List<OrderItem> items; // collection
}
```

```
-- SQL — order holds a foreign-key number
CREATE TABLE orders (
    id          BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id)  -- just a number
);
```

When you call `order.getCustomer()`, the database doesn't have an object. It has a `customer_id` column. Something must turn that number into a `Customer` object. **ORM does this automatically.**

## ORM: Object-Relational Mapping

**ORM** is the concept, not a library. It describes any technique that maps between object graphs and relational tables. In Java, the ORM layer:

-   Reads annotations on your classes (`@Entity`, `@Column`) to learn the mapping
-   Generates SQL from method calls (`repository.save()` → `INSERT`)
-   Converts `ResultSet` rows back into Java objects
-   Manages dirty checking: tracks which fields changed and only updates those
-   Handles lazy loading: fetches related data only when you access it

You *could* write JDBC code by hand. After the third `PreparedStatement` and `ResultSet.getString("email")`, you'll want ORM.

## JPA: the Specification

**JPA (Jakarta Persistence API)** is a *specification*, a set of interfaces and annotations that define how ORM should work in Java. Defines annotations like `@Entity`, `@Id`, `@OneToMany` and the `EntityManager` API. JPA itself **does nothing**. It is a contract, not an engine:

```
// JPA is just interfaces — no implementation code here
public interface EntityManager {
    void persist(Object entity);
    <T> T find(Class<T> entityClass, Object primaryKey);
    void remove(Object entity);
}
```

Anyone can write a JPA *provider*, an implementation that fulfills this contract. The specification lives in the `jakarta.persistence` package (moved from `javax.persistence` in Jakarta EE 9+).

## Hibernate: the Implementation

**Hibernate** is the most popular JPA provider. It's the actual runtime engine that:

-   Scans your `@Entity` classes and builds the mapping metadata
-   Translates JPA queries and criteria API calls into SQL
-   Manages the persistence context (first-level cache, dirty checking)
-   Generates schema DDL from your entity definitions
-   Provides features beyond the JPA spec: `@Cache`, natural IDs, multi-tenancy, envers auditing

When Spring Boot detects Hibernate on the classpath, it configures it as the JPA provider automatically. You rarely configure Hibernate directly. You configure JPA, and Hibernate does the work.

## Spring Data JPA: the Abstraction Layer

**Spring Data JPA** sits on top of JPA/Hibernate and eliminates boilerplate. You define an interface and Spring Data generates the implementation at runtime:

```
// You write this — just an interface
public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {
    // Spring Data generates the implementation automatically
    List<CustomerEntity> findByEmail(String email);
}
```

The full stack, top to bottom:

```
Your Code
  ↓
Spring Data JPA  (generates repository implementations)
  ↓
JPA / EntityManager  (the API contract)
  ↓
Hibernate  (the JPA provider — generates SQL, manages sessions)
  ↓
JDBC  (the raw database driver)
  ↓
PostgreSQL
```

Each layer has a job. Spring Data JPA saves you from writing `EntityManager` boilerplate. JPA defines the portable API. Hibernate actually runs it. JDBC talks to the database.

## Why Java Records Can't Be JPA Entities

Java 16 introduced **records**: concise, immutable data carriers. They look like natural fits for entities, but JPA **cannot use records as entities**. Three reasons:

**1\. No no-argument constructor.** JPA creates entity instances by calling a no-arg constructor, then populating fields. Records require all components in the constructor. There's no way to create a blank instance:

```
// Record — every field is a constructor parameter, no default constructor
public record CustomerRecord(String name, String email) {}

// JPA needs this (which records cannot provide):
// protected CustomerRecord() {}
```

**2\. Immutability.** JPA populates fields *after* construction. With setters on regular classes, that's straightforward. Records are immutable: no setters, no way to change a field after creation. JPA's dirty-checking mechanism also requires the ability to detect and apply changes.

**3\. Can't be subclassed.** Records are implicitly `final`. Hibernate uses **proxies** (runtime-generated subclasses) for lazy loading. When you call `order.getCustomer()`, Hibernate may return a proxy that loads the `Customer` from the database only when you first access it. If the entity class is `final`, Hibernate cannot create that proxy.

**The rule: entities are mutable classes with a no-arg constructor; records are for DTOs and value objects that don't need persistence.**

**Primary sources:** [Jakarta Persistence Specification](https://jakarta.ee/specifications/persistence/) · [Hibernate ORM User Guide](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html) · [Spring Data JPA Reference](https://docs.spring.io/spring-data/jpa/reference/)

## Check your understanding

<details>
<summary>1. What does "impedance mismatch" refer to in ORM?</summary>
<p><strong>Correct answer:</strong> The structural gap between object graphs and relational tables</p>
</details>

<details>
<summary>2. Which statement about JPA is correct?</summary>
<p><strong>Correct answer:</strong> JPA is a specification that defines interfaces and annotations for ORM</p>
</details>

<details>
<summary>3. Why can't a Java record be used as a JPA entity?</summary>
<p><strong>Correct answer:</strong> Records are immutable and final, so JPA can't construct, mutate, or proxy them</p>
</details>

<details>
<summary>4. In the Spring Data JPA stack, what does Hibernate actually do?</summary>
<p><strong>Correct answer:</strong> Implements the JPA specification by generating SQL and managing sessions</p>
</details>

<details>
<summary>5. Hibernate uses runtime-generated proxies for lazy loading. What property of JPA entities makes this possible, and what breaks if it's missing?</summary>
<p><strong>Correct answer:</strong> Entities must be non-final so Hibernate can subclass them; final classes break it</p>
</details>
