---
title: "Lesson 68: The PostgreSQL Query Planner"
description: "Lesson 68: The PostgreSQL Query Planner"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0068-query-planner.html
---

# The PostgreSQL Query Planner

When you write a SQL query, PostgreSQL does not execute it verbatim. It hands the query to the **planner** (also called the optimizer), which examines multiple execution strategies and picks the cheapest one. A wrong plan choice can mean the difference between a query finishing in milliseconds and one taking minutes. This lesson covers the planner's cost model, the scan and join strategies it chooses between, and how to read and influence its decisions.

## What the Planner Does

Given a query like `SELECT * FROM orders WHERE customer_id = 42`, the planner considers several ways to fetch the rows:

-   **Sequential scan**: read every row in the table, filter each one
-   **Index scan**: use the B-tree index on `customer_id`, fetch matching rows directly
-   **Bitmap heap scan**: use the index to collect row locations, then fetch them in physical order

For joins, there are additional strategies: nested loop, hash join, and merge join. The planner estimates the cost of each strategy and picks the lowest. This is **cost-based optimization**: the planner does not execute the query to measure; it estimates using statistics stored in the system catalogs.

## Cost-Based Optimization

Every plan node has three estimated values: **cost**, **rows**, and **width**. A typical EXPLAIN line looks like this:

```
Seq Scan on orders  (cost=0.00..15432.00 rows=100000 width=72)
```

What these numbers mean:

| Field | Meaning |
| --- | --- |
| `cost=0.00..15432.00` | Startup cost..total cost. Units are arbitrary "disk page fetches." Not milliseconds. The first number is work before the first row is returned; the second is total work. |
| `rows=100000` | Estimated number of rows this node will emit. Based on `pg_class.reltuples` and column statistics from `pg_statistic`. |
| `width=72` | Average row width in bytes, estimated from column statistics. |

The planner's cost model accounts for sequential I/O (cheap), random I/O (expensive), and CPU processing. It is a model, not a measurement: the estimates can be wrong, and when they are, the planner picks a suboptimal plan.

## Scan Strategies

### Sequential Scan (Seq Scan)

Reads every page of the table from start to end, evaluating the WHERE clause against each row. Despite reading every row, sequential I/O is fast. The planner chooses Seq Scan when:

-   The table is small (a few pages)
-   The query returns a large fraction of the table (typically over 5-10%)
-   No useful index exists

```
EXPLAIN SELECT * FROM orders;
-- Seq Scan on orders  (cost=0.00..15432.00 rows=100000 width=72)
```

### Index Scan

Uses a B-tree index to find matching rows directly, then fetches each row from the heap. Efficient when the result set is small. The random I/O per row makes this expensive for large result sets: fetching 50,000 rows scattered across 50,000 pages is slower than reading the whole table sequentially.

```
CREATE INDEX idx_orders_customer ON orders(customer_id);

EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
-- Index Scan using idx_orders_customer on orders  (cost=0.42..28.50 rows=10 width=72)
```

### Index-Only Scan

If all columns in the query are present in the index, PostgreSQL can answer from the index alone, without touching the heap at all. This requires the index to be **visible** (no dead tuples from recent updates) for all pages in the range. The visibility map tracks this.

```
CREATE INDEX idx_orders_cust_status ON orders(customer_id, status);

EXPLAIN SELECT customer_id, status FROM orders WHERE customer_id = 42;
-- Index Only Scan using idx_orders_cust_status on orders  (cost=0.42..12.80 rows=10 width=8)
```

Index-only scans are the fastest read pattern in PostgreSQL. If you have a query that selects only indexed columns, the database never reads the table at all.

### Bitmap Heap Scan

A middle ground between index scan and sequential scan. Works in two phases:

1.  **Bitmap Index Scan**: reads the index and builds a bitmap of page locations where matching rows live
2.  **Bitmap Heap Scan**: reads the table pages in physical order (sequential I/O), checking each row against the condition

The planner picks this when the result set is too large for a plain index scan (too much random I/O) but too small for a full sequential scan. Bitmap scans also support combining multiple indexes with AND/OR conditions.

```
EXPLAIN SELECT * FROM orders WHERE customer_id = 42 AND status = 'shipped';
-- Bitmap Heap Scan on orders
--   Recheck Cond: (customer_id = 42)
--   Filter: (status = 'shipped'::order_status)
--   -> Bitmap Index Scan on idx_orders_customer
--        Index Cond: (customer_id = 42)
```

## Join Strategies

When a query joins two tables, the planner picks one of three algorithms:

### Nested Loop Join

For each row in the outer table, scan the inner table for matches. Cost is proportional to `outer_rows * inner_cost_per_row`. Efficient when the outer table is small (a few dozen rows) and the inner side has an index. If both tables are large, nested loop degrades to O(M \* N).

```
EXPLAIN SELECT o.*, c.name
FROM orders o JOIN customers c ON o.customer_id = c.id
WHERE c.region = 'US';

-- Nested Loop
--   -> Seq Scan on customers c  (rows=5)       -- small outer
--   -> Index Scan on idx_orders_customer        -- indexed inner
```

### Hash Join

Build a hash table in memory from the smaller (build) table, then scan the larger (probe) table and look up matches in the hash table. Cost is roughly `build_rows + probe_rows`. Efficient for medium-to-large result sets where there is no useful index on the join key. Falls back to batching to disk if the hash table exceeds `work_mem`.

```
EXPLAIN SELECT o.*, c.name
FROM orders o JOIN customers c ON o.customer_id = c.id;

-- Hash Join
--   Hash Cond: (o.customer_id = c.id)
--   -> Seq Scan on orders o
--   -> Hash
--        -> Seq Scan on customers c
```

### Merge Join

Both inputs must be sorted on the join key. The planner walks both sorted streams in lockstep, emitting matches. Cost is `sort(outer) + sort(inner) + outer + inner` if the inputs are not already sorted. Efficient when both inputs are already sorted (e.g., via an index scan on the join key) or when the data is large and the sort cost is amortized.

```
EXPLAIN SELECT o.*, c.name
FROM orders o JOIN customers c ON o.customer_id = c.id
ORDER BY o.customer_id;

-- Merge Join
--   Merge Cond: (o.customer_id = c.id)
--   -> Index Scan on idx_orders_customer  -- already sorted
--   -> Index Scan using customers_pkey on c  -- already sorted
```

| Strategy | Best when | Requires |
| --- | --- | --- |
| Nested Loop | Small outer table, indexed inner | Index on inner join key |
| Hash Join | Medium-to-large sets, no useful index | Enough work\_mem for hash table |
| Merge Join | Large sorted inputs | Both inputs sorted on join key |

## How ANALYZE Affects Planner Decisions

The planner's estimates come from statistics stored in `pg_statistic`. These statistics are populated by the `ANALYZE` command (not to be confused with `EXPLAIN ANALYZE`). Running `ANALYZE` scans a random sample of rows from a table and updates:

-   `pg_class.reltuples`: estimated row count
-   `pg_statistic`: per-column statistics (most common values, histogram bounds, correlation between physical and logical order)

Autovacuum runs ANALYZE automatically after a threshold of changes (controlled by `autovacuum_analyze_threshold` and `autovacuum_analyze_scale_factor`). But if you bulk-load data or make large changes in a single transaction, the statistics will be stale until autovacuum catches up.

```
-- Manually update statistics for a table
ANALYZE orders;

-- Update statistics for a specific column
ANALYZE orders(customer_id);

-- In Spring Boot / JPA: trigger from a migration or admin endpoint
-- @Modifying @Query(value = "ANALYZE orders", nativeQuery = true)
-- void analyzeOrders();
```

Stale statistics are the single most common cause of bad plans. If a query that was fast yesterday is slow today, and the data has changed significantly, run `ANALYZE` and check the plan again.

## Reading EXPLAIN ANALYZE Output

`EXPLAIN` shows estimated costs. `EXPLAIN ANALYZE` actually runs the query and shows **actual** timings and row counts alongside the estimates:

```
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

-- Index Scan using idx_orders_customer on orders
--   (cost=0.42..28.50 rows=10 width=72)
--   (actual time=0.015..0.038 rows=8 loops=1)
-- Planning Time: 0.082 ms
-- Execution Time: 0.054 ms
```

Key fields in the `actual` line:

| Field | Meaning |
| --- | --- |
| `actual time=0.015..0.038` | Time to first row..time to last row, in milliseconds |
| `rows=8` | Actual rows returned (compare with estimated `rows=10`) |
| `loops=1` | Number of times this node was executed (more than 1 inside nested loops) |

When estimated rows and actual rows differ by an order of magnitude, the planner made a bad estimate. That bad estimate may have caused a bad plan (e.g., choosing a sequential scan when an index scan would be faster). The fix is usually to run ANALYZE or increase statistics target.

Planning Time and Execution Time are straightforward. If Planning Time is high (hundreds of milliseconds), consider `prepared_statements` to cache the plan.

## Disabling Plan Strategies for Debugging

Sometimes you suspect the planner chose the wrong strategy and want to see what would happen with a different one. PostgreSQL provides session-level `enable_*` flags:

```
-- Force the planner to avoid sequential scan
SET enable_seqscan = off;

-- Force the planner to avoid index scan
SET enable_indexscan = off;

-- Also available:
-- SET enable_bitmapscan = off;
-- SET enable_hashjoin = off;
-- SET enable_mergejoin = off;
-- SET enable_nestloop = off;

-- Check the new plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

-- Reset to defaults
RESET enable_seqscan;
```

These do not truly disable a strategy; they set its cost artificially high so the planner avoids it. If the planner still chooses the same strategy after you "disable" an alternative, it means no other strategy was viable. This is a debugging tool, not something to use in production queries.

## Common Planner Mistakes

### Stale Statistics

The most common cause. After bulk loads, major updates, or long-running transactions, `pg_class.reltuples` and column statistics may be far from reality. The planner estimates 100 rows, the query returns 1,000,000, and the resulting plan performs poorly. Fix: run `ANALYZE`.

### Wrong Join Order

The planner decides which table to scan first and which to join next. If it overestimates rows from the first table, it may choose nested loop when hash join would be better. This often happens with correlated subqueries that the planner cannot estimate accurately. Fix: rewrite the query (e.g., replace a subquery with a join), or increase `default_statistics_target` for the relevant columns.

### Implicit Type Casting Breaking Index Use

PostgreSQL will not use an index if the query's data type does not match the column type. This is easy to miss because the query still runs; it just runs slowly:

```
-- Column: phone VARCHAR(20)
-- This does NOT use the index:
SELECT * FROM customers WHERE phone = 5551234;
-- PostgreSQL casts the column phone to integer to compare,
-- making the B-tree index on phone unusable.

-- Correct: literal type matches column type
SELECT * FROM customers WHERE phone = '5551234';
```

In Spring Boot / JPA, this can happen when a `@Query` uses native SQL with parameter types that do not match the column definition. Always verify with `EXPLAIN` that your indexed columns are being used.

## Practical Example: Interpreting a Complex Query

Consider a query joining orders, customers, and order\_items, filtering by region and date:

```
EXPLAIN ANALYZE
SELECT c.name, o.id, SUM(oi.quantity * oi.unit_price) AS total
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
WHERE c.region = 'US'
  AND o.created_at >= '2025-01-01'
GROUP BY c.name, o.id
ORDER BY total DESC
LIMIT 20;

-- Limit  (cost=4521.32..4521.37 rows=20 width=52)
--        (actual time=12.456..12.462 rows=20 loops=1)
--   -> Sort  (cost=4521.32..4548.90 rows=11030 width=52)
--            (actual time=12.455..12.458 rows=20 loops=1)
--         Sort Key: (sum(...)) DESC
--         -> HashAggregate  (cost=3800.00..4300.00 rows=11030 width=52)
--                          (actual time=10.210..11.340 rows=9542 loops=1)
--               Group Key: c.name, o.id
--               -> Hash Join  (cost=250.00..2100.00 rows=40000 width=40)
--                            (actual time=1.200..5.890 rows=38750 loops=1)
--                     Hash Cond: (oi.order_id = o.id)
--                     -> Seq Scan on order_items oi
--                            (cost=0.00..1200.00 rows=50000 width=20)
--                            (actual time=0.010..1.200 rows=50000 loops=1)
--                     -> Hash
--                          -> Hash Join  (cost=50.00..600.00 rows=4000 width=28)
--                                       (actual time=0.400..2.100 rows=3850 loops=1)
--                               Hash Cond: (o.customer_id = c.id)
--                               -> Seq Scan on orders o
--                                      Filter: (created_at >= '2025-01-01')
--                                      (cost=0.00..400.00 rows=4500 width=16)
--                                      (actual time=0.008..0.800 rows=4200 loops=1)
--                               -> Hash
--                                    -> Seq Scan on customers c
--                                           Filter: (region = 'US')
--                                           (cost=0.00..30.00 rows=50 width=16)
--                                           (actual time=0.005..0.100 rows=48 loops=1)
-- Planning Time: 0.45 ms
-- Execution Time: 12.50 ms
```

Reading this bottom-up:

1.  **customers** is filtered to 48 rows (region = 'US'), estimated 50. Good estimate.
2.  **orders** is filtered to 4,200 rows (date range), estimated 4,500. Close enough.
3.  The planner chose **hash joins**: builds a hash table from customers, probes with orders, then builds a hash from the result, probes with order\_items. This is correct: medium-sized sets, no useful index on the join keys.
4.  **HashAggregate** groups the 38,750 rows into 9,542 groups. Estimated 11,030. Acceptable.
5.  **Sort** and **Limit**: the sort processes all 9,542 groups but the limit cuts delivery after 20 rows. The actual time for Sort shows it only delivered 20 rows to the Limit node.
6.  **Planning Time: 0.45 ms**, **Execution Time: 12.50 ms**. Total under 13 ms. No problem here.

If the estimated rows were off by 10x (e.g., estimated 4,500 but actual 450,000), the planner might have chosen nested loop instead of hash join, and execution time would increase significantly. The fix: run ANALYZE, check that statistics targets are adequate, and verify column types match query parameters.

**Primary sources:** [PostgreSQL Query Planner](https://www.postgresql.org/docs/current/planner-optimizer.html) · [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) · [Statistics Used by the Planner](https://www.postgresql.org/docs/current/planner-stats.html) · [Query Planner Configuration](https://www.postgresql.org/docs/current/runtime-config-query.html)

## Check your understanding

<details>
<summary>1. A query selects customer_id and status from a table with a composite index on (customer_id, status). The EXPLAIN output shows "Index Only Scan." What does this mean?</summary>
<p><strong>Correct answer:</strong> All requested columns are in the index, so PostgreSQL answered the query without reading the table at all</p>
</details>

<details>
<summary>2. You run EXPLAIN ANALYZE and see rows=500 (estimated) but actual rows=50000. What is the most likely cause and fix?</summary>
<p><strong>Correct answer:</strong> Stale statistics; run ANALYZE on the relevant tables so the planner has accurate row estimates</p>
</details>

<details>
<summary>3. The planner chooses a hash join for a query joining orders (1M rows) to customers (500 rows). Which table is used to build the hash table?</summary>
<p><strong>Correct answer:</strong> customers, because it is smaller and fits in memory; orders is the probe side</p>
</details>

<details>
<summary>4. A column phone is defined as VARCHAR with an index. The query SELECT * FROM customers WHERE phone = 5551234 does a sequential scan. Why?</summary>
<p><strong>Correct answer:</strong> The integer literal causes PostgreSQL to cast the column to integer, making the index unusable</p>
</details>

<details>
<summary>5. You set enable_seqscan = off and the planner still chooses a sequential scan. What does this mean?</summary>
<p><strong>Correct answer:</strong> No viable alternative strategy exists (e.g., no index), so the planner uses sequential scan despite the penalty</p>
</details>
