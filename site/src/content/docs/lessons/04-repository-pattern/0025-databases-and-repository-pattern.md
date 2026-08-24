---
title: "Databases, SQL Crash Course & the Repository Pattern"
description: "Databases, SQL Crash Course & the Repository Pattern"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/04-repository-pattern/0025-databases-and-repository-pattern.md
---

# Databases, SQL Crash Course & the Repository Pattern

Your application's objects vanish the moment the process stops. A **database** persists data to disk so it survives restarts, crashes, and deploys. This lesson covers how relational databases organize that data, the SQL you need to talk to them, and the Repository Pattern that keeps data-access logic from infecting your business code.

## Relational Databases

The most common kind of database is a **relational database** (RDBMS). It stores data in **tables**: think of each table as a spreadsheet with strict rules.

**customers**

| id | name | email | address |
| --- | --- | --- | --- |
| 1 | Alice | alice@example.com | 123 Main St |
| 2 | Bob | bob@example.com | 456 Oak Ave |

**products**

| id | name | price | stock |
| --- | --- | --- | --- |
| 1 | Widget | 19.99 | 100 |
| 2 | Gadget | 49.99 | 50 |

### Key terms

| Concept | What it means |
| --- | --- |
| **Table** | A named, structured collection of data, rows and columns |
| **Row** | A single record (one customer, one product) |
| **Column** | A named attribute across all rows (name, email, price) |
| **Primary Key** | A column (or columns) that *uniquely* identifies each row, usually an `id` |
| **Foreign Key** | A column that references a primary key in *another* table, creating a relationship |

### Relationships

Tables connect through foreign keys:

-   A **customer** can have many **orders** (one-to-many)
-   An **order** belongs to one **customer** (many-to-one)
-   An **order** has many **order items** (one-to-many)
-   An **order item** references one **product** (many-to-one)

```
Customer 1 ────< Order 1 ────< OrderItem >──── 1 Product
                                       >──── 1 Product
```

The `<` means "one to many": one customer, many orders. The foreign key lives on the "many" side: `orders.customer_id` points back to `customers.id`.

## SQL Crash Course

**SQL** (Structured Query Language) is how you read and mutate data in a relational database. You won't write much raw SQL in Spring (JPA generates it), but understanding the four fundamental operations helps you reason about what your repository calls actually do.

### SELECT: read data

```
-- All rows and columns
SELECT * FROM customers;

-- Filter by primary key
SELECT * FROM customers WHERE id = 1;

-- Specific columns only
SELECT name, email FROM customers WHERE id = 1;
```

### INSERT: create data

```
INSERT INTO customers (name, email, address)
VALUES ('Charlie', 'charlie@example.com', '789 Pine St');
```

### UPDATE: modify data

```
UPDATE customers SET address = '999 New St' WHERE id = 1;
```

Forgetting the `WHERE` clause updates *every* row. Always include it.

### DELETE: remove data

```
DELETE FROM customers WHERE id = 1;
```

Same rule: omit `WHERE` and you delete everything in the table.

### JOIN: combine data across tables

```
SELECT o.id, o.status, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

A `JOIN` links rows from two tables where a condition matches. Here, each order row is paired with its customer row through the foreign key `customer_id → id`. Without `JOIN`, you'd need two separate queries and manual stitching in your code.

### What JPA does for you

Instead of writing `SELECT * FROM customers WHERE id = 1`, you call `customerRepository.findById(1L)` and JPA generates the SQL. The repository calls in your service layer are SQL in disguise.

## The Repository Pattern

Without a repository, data-access code **infects every layer**. Your service opens connections, writes SQL strings, and maps result sets, all tangled with business logic:

```
// BAD — SQL scattered throughout the service
public class OrderService {
    public Order createOrder(...) {
        Connection conn = DriverManager.getConnection("jdbc:postgresql://...");
        PreparedStatement stmt = conn.prepareStatement(
            "INSERT INTO orders (customer_id, status) VALUES (?, ?)");
        stmt.setLong(1, customerId);
        stmt.setString(2, "PENDING");
        stmt.executeUpdate();
        // ... more SQL in every method
    }
}
```

The **Repository Pattern** puts all data access in one place. The service tells the repository *what* it needs, never *how* to get it:

```
// GOOD — service knows nothing about SQL
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderResponse createOrder(...) {
        OrderEntity order = new OrderEntity();
        order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);   // JPA generates the INSERT
        return OrderResponse.from(order);
    }
}
```

### Why it matters

-   **Single responsibility.** The service handles business rules; the repository handles persistence. Change your database? Modify the repository, not the service.
-   **Testability.** Swap the repository for a fake in tests: no database needed.
-   **No duplicated queries.** "Find by email" is written once in the repository, not copy-pasted across five services.

**Primary sources:** [Oracle: JDBC Basics](https://docs.oracle.com/javase/tutorial/jdbc/basics/index.html) · [PostgreSQL: The SQL Language](https://www.postgresql.org/docs/current/tutorial-sql.html) · [Martin Fowler: Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

## Check your understanding

<details>
<summary>1. A foreign key in the orders table that references customers.id means:</summary>
<p><strong>Correct answer:</strong> Each order is associated with exactly one customer</p>
</details>

<details>
<summary>2. What does JOIN accomplish in SQL?</summary>
<p><strong>Correct answer:</strong> It combines rows from two tables where a specified condition matches</p>
</details>

<details>
<summary>3. What happens if you run UPDATE customers SET name = 'X' without a WHERE clause?</summary>
<p><strong>Correct answer:</strong> Every row in the table has its name set to 'X'</p>
</details>

<details>
<summary>4. In the Repository Pattern, who is responsible for writing SQL?</summary>
<p><strong>Correct answer:</strong> The repository, so the service layer stays unaware of persistence details</p>
</details>

<details>
<summary>5. Which statement correctly distinguishes a primary key from a foreign key?</summary>
<p><strong>Correct answer:</strong> A primary key uniquely identifies rows in its own table; a foreign key references a primary key in another table</p>
</details>
