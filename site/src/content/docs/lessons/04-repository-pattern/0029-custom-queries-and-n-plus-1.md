---
title: "Custom Queries, Pagination & the N+1 Problem"
description: "Custom Queries, Pagination & the N+1 Problem"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0029-custom-queries-and-n-plus-1.html
---

# Custom Queries, Pagination & the N+1 Problem

Derived query methods take you far, but not everywhere. When you need aggregates, complex joins, or database-specific functions, you write the query yourself. This lesson covers `@Query` with JPQL and native SQL, pagination with `Pageable`, and the N+1 problem: a silent performance killer that turns one database round-trip into hundreds.

## @Query with JPQL

**JPQL** (Java Persistence Query Language) looks like SQL but operates on *entities and fields*, not tables and columns. You write it as a string inside `@Query`:

```
@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    // JPQL — entity name, field name, named parameter
    @Query("SELECT o FROM OrderEntity o WHERE o.status = :status AND o.createdAt > :after")
    List<OrderEntity> findRecentByStatus(@Param("status") OrderStatus status,
                                          @Param("after") Instant after);

    // Aggregate — SUM returns a number, not an entity
    @Query("SELECT SUM(o.totalAmount) FROM OrderEntity o WHERE o.status = 'CONFIRMED'")
    BigDecimal getTotalConfirmedRevenue();

    // JOIN FETCH — fetches related data in one query (more on this below)
    @Query("SELECT DISTINCT o FROM OrderEntity o LEFT JOIN FETCH o.items WHERE o.status = :status")
    List<OrderEntity> findByStatusWithItems(@Param("status") OrderStatus status);
}
```

Key rules: entity name (`OrderEntity`), not table name (`orders`); field name (`o.createdAt`), not column name (`created_at`); named parameters prefixed with `:` and bound via `@Param`.

## @Query with Native SQL

When JPQL can't express what you need (database-specific functions, complex subqueries, window functions), switch to native SQL with `nativeQuery = true`:

```
// Native SQL uses table/column names, not entity/field names
@Query(value = "SELECT * FROM orders WHERE EXTRACT(MONTH FROM created_at) = :month",
       nativeQuery = true)
List<OrderEntity> findByMonth(@Param("month") int month);

// Native SQL with pagination — Spring appends LIMIT/OFFSET for you
@Query(value = "SELECT * FROM orders WHERE status = :status",
       nativeQuery = true)
Page<OrderEntity> findByStatusNative(@Param("status") String status, Pageable pageable);
```

Trade-off: native SQL couples you to a specific database. If you ever switch from PostgreSQL to MySQL, your `EXTRACT` call may break. Reach for native SQL **only** when JPQL genuinely cannot do the job.

|  | JPQL | Native SQL |
| --- | --- | --- |
| Operates on | Entities & fields | Tables & columns |
| Database portability | Portable | Database-specific |
| Named parameters | `:name` | `:name` |
| Aggregates | Yes | Yes |
| DB-specific functions | No | Yes |
| Set with | `@Query("...")` | `@Query(value="...", nativeQuery=true)` |

## Pagination & Sorting

Returning thousands of rows at once kills performance and memory. Spring Data gives you `Pageable`: pass it to any repository method and Spring generates `LIMIT`/`OFFSET` SQL automatically.

```
// In the repository — just add Pageable as the last parameter
Page<OrderEntity> findByStatus(OrderStatus status, Pageable pageable);

// In the caller
Pageable pageable = PageRequest.of(0, 20, Sort.by("createdAt").descending());
//           page index ↑  ↑ page size          ↑ sort direction

Page<OrderEntity> page = orderRepository.findByStatus(OrderStatus.PENDING, pageable);

page.getContent();        // List of orders on this page
page.getTotalElements();  // Total count across all pages
page.getTotalPages();     // Total number of pages
page.getNumber();         // Current page number (0-based)
page.hasNext();           // Is there a next page?
page.hasPrevious();       // Is there a previous page?
```

`PageRequest.of(page, size)` gives you unsorted results. Add a `Sort` for ordering. For derived query methods, you can also return `Slice<T>`: same API but skips the `COUNT` query, making it faster when you only need "is there more?"

## The N+1 Problem

This is the most common JPA performance pitfall. It happens when you fetch a list of entities and then *access their lazy-loaded relationships*:

```
// 1 query: fetch 10 orders
List<OrderEntity> orders = orderRepository.findAll();
// SELECT * FROM orders LIMIT 10

for (OrderEntity order : orders) {
    // N queries: one per order to fetch the customer
    String name = order.getCustomer().getName();
    // SELECT * FROM customers WHERE id = ?
}
```

**1 query for orders + 10 queries for customers = 11 queries.** With a hundred orders you fire a hundred and one. The caller never sees the extra queries because they happen silently inside the loop. The symptom: the endpoint is slow and gets slower as data grows.

The root cause: the `OrderEntity` uses `@ManyToOne(fetch = FetchType.LAZY)`. Each `.getCustomer()` inside the loop triggers a separate `SELECT`. The N+1 problem: 1 query for `findAll()` + N queries for lazy association access. Eager loading would also fire per-entity queries. The fundamental issue is accessing an association inside a loop without a JOIN FETCH or @EntityGraph.

### Fix 1: JOIN FETCH

Add `JOIN FETCH` to your JPQL query. It tells JPA to fetch the related entity in the *same* `SELECT`:

```
@Query("SELECT o FROM OrderEntity o JOIN FETCH o.customer WHERE o.status = :status")
List<OrderEntity> findByStatusWithCustomer(@Param("status") OrderStatus status);
```

This generates a single SQL query with a JOIN:

```
SELECT o.*, c.* FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = ?
```

**11 queries → 1 query.** Use `DISTINCT` when fetching `@OneToMany` collections to deduplicate parent rows:

```
@Query("SELECT DISTINCT o FROM OrderEntity o LEFT JOIN FETCH o.items")
List<OrderEntity> findAllWithItems();
```

### Fix 2: @EntityGraph

When you want eager fetching *without* modifying the JPQL string, use `@EntityGraph`. It declares which associations to load eagerly for that query only:

```
@EntityGraph(attributePaths = {"customer", "items", "items.product"})
@Query("SELECT o FROM OrderEntity o WHERE o.status = :status")
List<OrderEntity> findByStatusWithAllRelations(@Param("status") OrderStatus status);
```

`@EntityGraph` is ideal when the same JPQL should sometimes fetch relations and sometimes not: you keep one query, add different graphs at call sites. It does *not* change the entity's default fetch strategy; it only overrides it for this specific call.

|  | JOIN FETCH | @EntityGraph |
| --- | --- | --- |
| Where specified | In the JPQL string | Annotation on the method |
| Multiple levels | Manual `JOIN FETCH` per level | `attributePaths = {"a", "a.b"}` |
| Reuse query text | No: different JPQL | Yes: same JPQL, different graph |
| Collection dedup | Need `DISTINCT` | Need `DISTINCT` |

**Primary sources:** [Spring Data JPA: Query Methods](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html) · [Jakarta Persistence: JPQL](https://jakarta.ee/specifications/persistence/3.1/jakarta-persistence-spec-3.1.html#jpql) · [Spring Data JPA: @EntityGraph](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-graph.html)

## Check your understanding

<details>
<summary>1. In a JPQL query, what do you reference: table and column names, or entity and field names?</summary>
<p><strong>Correct answer:</strong> Entity and field names; JPQL operates on the object model</p>
</details>

<details>
<summary>2. What does nativeQuery = true change about a @Query declaration?</summary>
<p><strong>Correct answer:</strong> It switches the query language from JPQL to actual SQL</p>
</details>

<details>
<summary>3. You call findAll() on orders, then loop and call order.getCustomer().getName() for each. With 50 orders, how many SQL queries execute?</summary>
<p><strong>Correct answer:</strong> 51; one for findAll plus one per order for the lazy customer</p>
</details>

<details>
<summary>4. Why would you choose @EntityGraph over JOIN FETCH?</summary>
<p><strong>Correct answer:</strong> You want to reuse the same JPQL but vary which associations are fetched</p>
</details>

<details>
<summary>5. What does PageRequest.of(2, 10, Sort.by("price").ascending()) return?</summary>
<p><strong>Correct answer:</strong> The third page of 10 rows each, sorted by price ascending</p>
</details>
