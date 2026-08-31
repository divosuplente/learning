---
title: "PostgreSQL Deep Dive"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/13-postgresql-database/0066-postgresql-deep-dive.md
---

You have used MySQL and SQLite in earlier lessons. PostgreSQL differs from both: it treats SQL as a first-class programming language, not just a query interface. This lesson covers what makes PostgreSQL distinct, how to connect it to Spring Boot, and the column types you will use most often: `SERIAL`, `UUID`, `JSONB`, `ARRAY`, `ENUM`, and `tsvector`.

## Why PostgreSQL Over MySQL or SQLite

SQLite is a file-based database suited for local testing and embedded use. MySQL is a common choice for simple web applications. PostgreSQL differs in three areas that affect daily development.

### JSONB: structured data without a separate table

PostgreSQL's `JSONB` type stores JSON as a binary structure you can query and index. MySQL has a `JSON` type, but PostgreSQL indexes JSONB columns with GIN indexes and lets you query nested keys directly:

```
-- Find orders where metadata->source equals "web"
SELECT * FROM orders
WHERE metadata @> '{"source": "web"}';

-- GIN index for fast lookups
CREATE INDEX idx_orders_metadata ON orders USING GIN (metadata);
```

SQLite has no native JSON type. You store text and parse it in your application, with no indexing support.

### CTEs and window functions

Common Table Expressions (`WITH` clauses) let you break complex queries into named subqueries. PostgreSQL supports **recursive CTEs** for tree traversal and **writable CTEs** that combine `INSERT`/`UPDATE`/`DELETE` with a `RETURNING` clause:

```
-- Writable CTE: insert a row and return the generated ID
WITH new_order AS (
    INSERT INTO orders (customer_id, total)
    VALUES (42, 99.99)
    RETURNING id
)
SELECT id FROM new_order;
```

Window functions compute aggregates across rows without collapsing the result set. MySQL added them in version 8.0; PostgreSQL has had them since version 8.4 and covers more functions.

### Extensions

PostgreSQL loads extensions with a single command. Common ones:

-   `pg_stat_statements`: track query performance.
-   `uuid-ossp`: generate UUIDs inside the database.
-   `pg_trgm`: fuzzy text matching with trigram indexes.
-   `postgis`: geospatial queries (points, distances, polygons).

MySQL has a plugin system, but the ecosystem is smaller. SQLite has none.

## Connecting Spring Boot to PostgreSQL

Add two dependencies to your `pom.xml`:

```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

The JPA starter pulls in Hibernate. The PostgreSQL driver is the JDBC implementation for PostgreSQL. Spring Boot auto-configures a `DataSource` from your properties.

### application.properties

```
spring.datasource.url=jdbc:postgresql://localhost:5432/myapp
spring.datasource.username=myapp_user
spring.datasource.password=secret

# Hibernate dialect — tell Hibernate to use PostgreSQL-specific SQL
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect

# Validate schema on startup ( catches entity/table mismatches early )
spring.jpa.hibernate.ddl-auto=validate

# Show SQL for debugging ( disable in production )
spring.jpa.show-sql=true
```

The `jdbc:postgresql://` prefix tells the driver which protocol to use. Port 5432 is the PostgreSQL default. The dialect setting makes Hibernate emit PostgreSQL syntax (`SERIAL` instead of `AUTO_INCREMENT`, `JSONB` instead of `VARCHAR`, and so on).

**Never use `ddl-auto=create` or `create-drop` in production.** Hibernate's schema generation does not handle migrations, column renames, or data transformations. Use Flyway or Liquibase for production schema management. The `validate` setting checks that your entities match the existing schema without modifying it.

## PostgreSQL-Specific Column Types

PostgreSQL has types with no direct equivalent in MySQL or SQLite:

### SERIAL: auto-incrementing integer

`SERIAL` is not a true type; it is a shorthand that creates a sequence and sets the column default to the sequence's next value. It is the standard way to generate integer primary keys in PostgreSQL:

```
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);
```

PostgreSQL also has `BIGSERIAL` (64-bit) and `SMALLSERIAL` (16-bit). In JPA, map it with `@GeneratedValue(strategy = GenerationType.IDENTITY)`.

### UUID: universally unique identifier

PostgreSQL has a native `UUID` type stored as 128 bits. It is faster and smaller than storing a UUID as a 36-character `VARCHAR`:

```
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL
);
```

The `DEFAULT uuid_generate_v4()` generates a random UUID at insert time. In JPA, you can also generate the UUID in Java before persisting.

### JSONB: queryable JSON

`JSONB` stores JSON in a decomposed binary format. Unlike the `JSON` type (which stores the exact text), `JSONB` supports indexing and discards whitespace and key ordering.

```
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Insert with a JSON object
INSERT INTO orders (metadata) VALUES (
    '{"source": "web", "campaign": "summer-sale", "tags": ["urgent", "vip"]}'
);

-- Query nested keys
SELECT metadata->>'source' AS source FROM orders;

-- Containment query (uses GIN index)
SELECT * FROM orders WHERE metadata @> '{"source": "web"}';
```

The `->` operator returns JSON; `->>` returns text. The `@>` containment operator checks whether the left JSONB value contains the right one at the top level.

### ARRAY: list of values in a single column

PostgreSQL arrays store multiple values of the same type in one column without a join table:

```
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'
);

-- Insert with array literal
INSERT INTO articles (title, tags) VALUES ('Spring Boot 3', ARRAY['java', 'spring']);

-- Query by array element
SELECT * FROM articles WHERE 'spring' = ANY(tags);
```

Arrays are not normalized: you cannot enforce foreign keys on array elements. Use them for denormalized data like tags or flags that you query but do not join on.

### ENUM: fixed set of values

PostgreSQL enums are defined at the database level, not just the column level:

```
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED');

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    status order_status NOT NULL DEFAULT 'PENDING'
);
```

Unlike MySQL enums (which are column-scoped strings), PostgreSQL enums are true types. You must drop and recreate the type to add values. Use a `CHECK` constraint instead if you need to add values frequently.

### tsvector: full-text search

`tsvector` stores pre-processed text for full-text search. A matching `tsquery` type holds the search expression:

```
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    search_vector TSVECTOR
);

-- Update the search vector from content
UPDATE documents
SET search_vector = to_tsvector('english', content);

-- Full-text search
SELECT * FROM documents
WHERE search_vector @@ to_tsquery('english', 'spring & boot');

-- GIN index for fast full-text search
CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);
```

The `@@` operator matches a tsvector against a tsquery. The `&` is logical AND; `|` is OR; `!` is NOT. PostgreSQL handles stemming, stop words, and ranking.

## Using PostgreSQL Types in JPA Entities

JPA does not know about PostgreSQL-specific types by default. You tell Hibernate how to map them through `@Column(columnDefinition = ...)` and custom type annotations.

### UUID primary keys

```
@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private String email;

    // constructors, getters, setters
}
```

`columnDefinition = "uuid"` tells Hibernate to use the PostgreSQL `UUID` type when generating DDL. When `ddl-auto=validate`, Hibernate checks that the column type matches.

### JSONB with @Column columnDefinition

The simplest approach: map JSONB to a `String` and handle serialization yourself.

```
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "jsonb", nullable = false)
    private String metadata;

    // Manual serialization
    public Map<String, Object> getMetadataAsMap() {
        try {
            return new ObjectMapper().readValue(metadata, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
```

This works, but you lose type safety: the field is a raw `String`, and you serialize and deserialize manually. The next section shows a better approach.

## Hypersistence Utils for JSONB and ARRAY

[Hypersistence Utils](https://github.com/vladmihalcea/hypersistence-utils) (formerly Hibernate Types) provides custom Hibernate types for PostgreSQL JSONB and ARRAY. It integrates with JPA's `@TypeDef` mechanism.

### Maven dependency

```
<dependency>
    <groupId>io.hypersistence</groupId>
    <artifactId>hypersistence-utils-hibernate-63</artifactId>
    <version>3.7.0</version>
</dependency>
```

Match the Hibernate version suffix to your Spring Boot version. Spring Boot 3.2+ ships Hibernate 6.4+, so use `hibernate-63`.

### JSONB mapping with a typed Java object

```
@Entity
@Table(name = "orders")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Type("jsonb")
    @Column(columnDefinition = "jsonb", nullable = false)
    private OrderMetadata metadata;

    // getters, setters
}

public class OrderMetadata {
    private String source;
    private String campaign;
    private List<String> tags;

    // default constructor (required by Jackson), getters, setters
}
```

The `@TypeDef` registers `JsonBinaryType` under the name `"jsonb"`. The `@Type("jsonb")` annotation on the field tells Hibernate to use that type for the column. Hibernate serializes `OrderMetadata` to JSONB on write and deserializes it back on read, so you do not need to call Jackson directly.

### ARRAY mapping

```
@Entity
@Table(name = "articles")
@TypeDef(name = "string-array", typeClass = StringArrayType.class)
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Type("string-array")
    @Column(name = "tags", columnDefinition = "text[]")
    private String[] tags;

    // getters, setters
}
```

Hypersistence Utils maps the Java `String[]` directly to PostgreSQL's `text[]`. No join table or extra entity required.

## Practical Example: Order Entity with JSONB and UUID

Full working entity combining UUID primary key, JSONB metadata, and enum status:

```
-- SQL schema
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email VARCHAR(255) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    total NUMERIC(10, 2) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_metadata ON orders USING GIN (metadata);
CREATE INDEX idx_orders_status ON orders (status);
```

```
// Java entity
@Entity
@Table(name = "orders")
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "customer_email", nullable = false)
    private String customerEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Type("jsonb")
    @Column(columnDefinition = "jsonb", nullable = false)
    private OrderMetadata metadata;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    // getters, setters
}

public enum OrderStatus {
    PENDING, CONFIRMED, SHIPPED, CANCELLED
}

public class OrderMetadata {
    private String source;
    private String campaign;
    private List<String> tags;

    public OrderMetadata() {} // Jackson requires a default constructor

    public OrderMetadata(String source, String campaign, List<String> tags) {
        this.source = source;
        this.campaign = campaign;
        this.tags = tags;
    }

    // getters, setters
}
```

Key points in this entity:

-   `UUID` primary key generated in Java with `@PrePersist` as a fallback, or by the database `DEFAULT uuid_generate_v4()`.
-   `OrderStatus` enum mapped as a string (`@Enumerated(EnumType.STRING)`), matching the PostgreSQL enum type.
-   `OrderMetadata` mapped to JSONB through Hypersistence Utils: no manual serialization.
-   The GIN index on `metadata` makes containment queries fast.

**Enum mismatch:** PostgreSQL enums and Java enums must stay in sync. If the database has `'SHIPPED'` but Java does not, Hibernate throws a mapping error on read. Prefer `CHECK` constraints over PostgreSQL enum types when values change frequently, or use Flyway migrations to alter the enum type.

**Primary sources:** [PostgreSQL Data Types](https://www.postgresql.org/docs/current/datatype.html) · [PostgreSQL JSON Types](https://www.postgresql.org/docs/current/datatype-json.html) · [PostgreSQL JSON Functions and Operators](https://www.postgresql.org/docs/current/functions-json.html) · [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html) · [Spring Boot SQL Data Access](https://docs.spring.io/spring-boot/reference/data/sql.html) · [Hypersistence Utils](https://github.com/vladmihalcea/hypersistence-utils)

## Check your understanding

<details>
<summary>1. What does the JSONB type in PostgreSQL provide that the plain JSON type does not?</summary>
<p><strong>Correct answer:</strong> Indexing support through GIN indexes and faster containment queries</p>
</details>

<details>
<summary>2. In Spring Boot, what does spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect do?</summary>
<p><strong>Correct answer:</strong> It tells Hibernate to generate PostgreSQL-specific SQL (SERIAL, JSONB, etc.)</p>
</details>

<details>
<summary>3. You have a UUID primary key in PostgreSQL. What is the advantage of using the native UUID type instead of VARCHAR(36)?</summary>
<p><strong>Correct answer:</strong> Native UUID stores 128 bits (16 bytes), which is smaller and faster to compare than a 36-character string</p>
</details>

<details>
<summary>4. What does @TypeDef(name = "jsonb", typeClass = JsonBinaryType.class) do in a JPA entity?</summary>
<p><strong>Correct answer:</strong> It registers a custom Hibernate type that maps a Java object to a PostgreSQL JSONB column</p>
</details>

<details>
<summary>5. What is a practical risk when using PostgreSQL's ENUM type with a Java enum mapped by @Enumerated(EnumType.STRING)?</summary>
<p><strong>Correct answer:</strong> If the database enum has a value that the Java enum lacks, reading that row throws a mapping error</p>
</details>
