---
title: "Database Indexes"
description: "Database Indexes"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0067-database-indexes.html
---

# Database Indexes

A query like `SELECT * FROM orders WHERE customer_id = 42` scans every row in the table to find matches. On a table with ten million rows, that means reading ten million rows even if only three match. An index gives PostgreSQL a shortcut: a sorted data structure that lets it jump straight to the rows it needs, the way a book index sends you to a page number without reading every page. This lesson covers the index types PostgreSQL offers, how to choose the right one, and how to spot when an index is missing or when too many are hurting you.

## What an Index Is: B-Tree Structure

PostgreSQL's default index type is a **B-tree** (balanced tree). A B-tree stores indexed values in sorted order inside a multi-level tree. The root and branch pages hold key ranges that point to child pages. Leaf pages hold the actual values and pointers to table rows (CTIDs). To find a value, the database descends from root to leaf in O(log n) page reads instead of scanning all pages sequentially.

```
-- Without an index: sequential scan of every row
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
-- Seq Scan on orders  (cost=0.00..154321.00 rows=1 width=72) (actual time=85.4..312.6 rows=3 loops=1)

-- Create a B-tree index
CREATE INDEX idx_orders_customer_id ON orders (customer_id);

-- With the index: index scan, a few page reads
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
-- Index Scan using idx_orders_customer_id on orders  (cost=0.42..8.45 rows=3 width=72) (actual time=0.015..0.022 rows=3 loops=1)
```

An index trades disk space for query speed.

## B-Tree Indexes

B-tree is the default when you write `CREATE INDEX`. It handles all the common comparison operators:

-   Equality: `=`
-   Range: `<`, `>`, `<=`, `>=`, `BETWEEN`
-   Sorted output: `ORDER BY` on the indexed column (the index is already sorted, so no sort step needed)
-   Prefix pattern matching: `LIKE 'abc%'` (but not `LIKE '%abc'`)

```
-- Range query benefits from B-tree
SELECT * FROM products WHERE price BETWEEN 10 AND 50 ORDER BY price;

-- ORDER BY can use the index directly
SELECT * FROM orders WHERE status = 'PENDING' ORDER BY created_at;
CREATE INDEX idx_orders_status_created ON orders (status, created_at);
```

**Check the operator class:** B-tree indexes work with data types that have a sort order (numbers, dates, text). Types without a natural ordering, like `jsonb` or `uuid`, need GIN or hash indexes instead for exact-match lookups.

## Hash Indexes

A hash index stores a hash code of the indexed value. It supports **only equality comparisons** (`=`). No range queries, no ordering. The tradeoff: for exact-match lookups, hash indexes can be faster than B-tree because they skip the tree traversal and go directly to a bucket.

```
-- Hash index: equality only
CREATE INDEX idx_sessions_token ON sessions USING hash (token);

-- This uses the index
SELECT * FROM sessions WHERE token = 'abc123';

-- This does NOT use the hash index (range query)
SELECT * FROM sessions WHERE token > 'abc123';
```

Historically, hash indexes in PostgreSQL were not crash-safe before version 10. Since PostgreSQL 10, they are fully WAL-logged and safe for production. Use them when you need fast exact-match lookups on columns with no range queries, such as session tokens, short identifiers, or lookup keys.

## Unique Indexes

A unique index enforces that no two rows share the same value in the indexed column(s). It also provides the same lookup speed as a regular index. PostgreSQL automatically creates a unique index when you declare a `UNIQUE` constraint or a `PRIMARY KEY`.

```
-- Explicit unique index
CREATE UNIQUE INDEX idx_users_email ON users (email);

-- These are equivalent: both create a unique B-tree index
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Primary key creates a unique index automatically
ALTER TABLE orders ADD PRIMARY KEY (id);
-- PostgreSQL creates: CREATE UNIQUE INDEX orders_pkey ON orders (id);
```

Inserting a duplicate value fails with a constraint violation:

```
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice');
-- OK

INSERT INTO users (email, name) VALUES ('alice@example.com', 'Another Alice');
-- ERROR: duplicate key value violates unique constraint "idx_users_email"
-- DETAIL: Key (email)=(alice@example.com) already exists.
```

Use `INSERT ... ON CONFLICT` to handle duplicates:

```
INSERT INTO users (email, name) VALUES ('alice@example.com', 'Alice Updated')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
```

## Composite Indexes

A composite index covers multiple columns. The **column order matters**. A B-tree composite index is sorted left-to-right: first by the leftmost column, then by the next, and so on. A query can use the index only if it filters on a **leftmost prefix** of the indexed columns.

```
-- Composite index on (status, created_at)
CREATE INDEX idx_orders_status_created ON orders (status, created_at);

-- Uses the index: filters on the leftmost column
SELECT * FROM orders WHERE status = 'SHIPPED';

-- Uses the index: filters on both columns (full prefix)
SELECT * FROM orders WHERE status = 'SHIPPED' AND created_at > '2025-01-01';

-- Does NOT use the index: skips the leftmost column
SELECT * FROM orders WHERE created_at > '2025-01-01';

-- Uses the index for status, but created_at is not filtered
SELECT * FROM orders WHERE status = 'SHIPPED' ORDER BY created_at;
```

### The leftmost prefix rule

Think of a phone book sorted by last name, then first name. You can find everyone with last name "Smith" easily. You can find "Smith, Alice" easily. But you cannot find everyone with first name "Alice" without scanning the whole book, because first names are only sorted *within* each last name group. Composite indexes work the same way.

**Rule of thumb:** Put the column with the most selective filters (the one that narrows results the most) as the leftmost column. If queries filter on both columns equally, put the column used in equality conditions first and range conditions second.

## Partial Indexes

A partial index includes only rows that match a `WHERE` condition. It is smaller than a full index because it excludes rows that do not match, and it accelerates queries that target the same subset.

```
-- Index only active users, not the millions of soft-deleted ones
CREATE INDEX idx_users_email_active ON users (email)
WHERE deleted_at IS NULL;

-- Query the index covers
SELECT * FROM users WHERE email = 'alice@example.com' AND deleted_at IS NULL;

-- Index only unpaid orders for a common dashboard query
CREATE INDEX idx_orders_unpaid ON orders (customer_id, created_at)
WHERE status = 'UNPAID';

-- This uses the partial index
SELECT * FROM orders WHERE customer_id = 42 AND status = 'UNPAID';
-- This does NOT (status condition not in the query)
SELECT * FROM orders WHERE customer_id = 42;
```

Partial indexes are useful when a large fraction of rows never appears in queries: soft-deleted records, inactive accounts, completed tasks. The index stays small and fast because it skips the irrelevant rows.

## Covering Indexes (INCLUDE)

A covering index includes extra columns in its leaf pages that the query needs, so the database can answer the query from the index alone without going back to the table. This is called an **index-only scan**, and it is often an order of magnitude faster because it avoids random I/O to fetch table pages.

```
-- Standard index: PostgreSQL finds the row in the index, then fetches the full row from the table
CREATE INDEX idx_orders_customer_id ON orders (customer_id);

-- Covering index: includes columns the query needs
CREATE INDEX idx_orders_customer_covering ON orders (customer_id)
INCLUDE (total_amount, status);

-- This query can now be answered entirely from the index
SELECT customer_id, total_amount, status
FROM orders
WHERE customer_id = 42;

-- EXPLAIN shows "Index Only Scan" instead of "Index Scan"
```

Columns in `INCLUDE` are stored in leaf pages but are **not part of the sort key**. This means they cannot be used for filtering or ordering, only for returning values. The index stays sorted by `customer_id` alone, so the tree remains compact.

**When to use INCLUDE:** If a query selects a few extra columns beyond the indexed ones, adding them via `INCLUDE` can eliminate the table lookup entirely. Do not include columns you rarely query: they enlarge the index without benefit.

## Finding Missing Indexes with EXPLAIN ANALYZE

PostgreSQL tells you exactly how it executes a query. `EXPLAIN` shows the plan; `EXPLAIN ANALYZE` runs the query and reports actual times.

### Reading EXPLAIN output

```
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

-- Without index:
-- Seq Scan on orders  (cost=0.00..154321.00 rows=3 width=72) (actual time=85.4..312.6 rows=3 loops=1)
--   Filter: (customer_id = 42)
--   Rows Removed by Filter: 999997
-- Planning Time: 0.08 ms
-- Execution Time: 313.1 ms

-- With index:
-- Index Scan using idx_orders_customer_id on orders  (cost=0.42..8.45 rows=3 width=72) (actual time=0.015..0.022 rows=3 loops=1)
--   Index Cond: (customer_id = 42)
-- Planning Time: 0.12 ms
-- Execution Time: 0.04 ms
```

Key signals that an index is missing:

-   **Seq Scan** on a large table with a `Filter` line removing almost all rows.
-   **Rows Removed by Filter** is high relative to rows returned.
-   **Execution Time** is noticeably slow despite few results.

### Checking for sequential scans at scale

PostgreSQL tracks index usage statistics. Query `pg_stat_user_tables` to find tables with high sequential scans:

```
SELECT relname AS table_name,
       seq_scan,
       idx_scan,
       n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 10;
```

A table with millions of rows and a high `seq_scan` count relative to `idx_scan` likely needs an index on its common filter columns.

## When Indexes Hurt

Indexes are not free. Every `INSERT`, `UPDATE`, or `DELETE` must update every index on the affected table. More indexes means slower writes.

```
-- Each of these adds overhead to every INSERT/UPDATE/DELETE on orders
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at);
CREATE INDEX idx_orders_total ON orders (total_amount);
CREATE INDEX idx_orders_status_created ON orders (status, created_at);
```

The costs:

-   **Write slowdown:** Each index adds roughly 10-30% overhead to write operations. Five indexes can double or triple insertion time.
-   **Storage:** Each index is a separate data structure on disk. On a large table, five indexes can consume as much space as the table itself.
-   **Maintenance:** `VACUUM` and `ANALYZE` have more work to do. Index bloat accumulates over time if the table sees heavy updates.
-   **Optimizer confusion:** With many similar indexes, the planner may pick a suboptimal one, or waste planning time choosing.

**Rule of thumb:** Index to support your actual queries, not every column. Start with the slow queries from `EXPLAIN ANALYZE` and add indexes only where sequential scans are the bottleneck. Drop indexes that no query uses.

Find unused indexes:

```
SELECT indexrelname AS index_name,
       idx_scan AS times_used,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

An index with `idx_scan = 0` since the last statistics reset has never been used for a query. It is costing writes and storage for no benefit. Drop it.

## Practical Examples

### Index for a common lookup

```
-- User login query: exact match on email
SELECT * FROM users WHERE email = 'alice@example.com';

-- Add a unique index (enforces uniqueness + speeds up)
CREATE UNIQUE INDEX idx_users_email ON users (email);
```

### Index for a filtered dashboard query

```
-- Dashboard shows recent unpaid orders per customer
SELECT * FROM orders
WHERE customer_id = 42 AND status = 'UNPAID'
ORDER BY created_at DESC;

-- Composite index with leftmost prefix matching both filters
CREATE INDEX idx_orders_customer_status_created
ON orders (customer_id, status, created_at DESC);
```

### Partial index for soft-deleted rows

```
-- Most queries filter out soft-deleted records
SELECT * FROM products WHERE category = 'electronics' AND deleted_at IS NULL;

-- Index only the active rows
CREATE INDEX idx_products_category_active
ON products (category) WHERE deleted_at IS NULL;
```

### Covering index for a reporting query

```
-- Report: total amount per status
SELECT status, SUM(total_amount) FROM orders GROUP BY status;

-- Covering index: the query never touches the table
CREATE INDEX idx_orders_status_total
ON orders (status) INCLUDE (total_amount);
```

**Primary sources:** [PostgreSQL CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html) · [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) · [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html) · [Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html) · [Index-Only Scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html)

## Check your understanding

<details>
<summary>1. A B-tree composite index is defined as CREATE INDEX idx ON orders (status, created_at). Which query can use this index?</summary>
<p><strong>Correct answer:</strong> SELECT * FROM orders WHERE status = 'SHIPPED'</p>
</details>

<details>
<summary>2. What does EXPLAIN ANALYZE show that EXPLAIN alone does not?</summary>
<p><strong>Correct answer:</strong> Actual execution times and row counts from running the query</p>
</details>

<details>
<summary>3. A partial index CREATE INDEX idx ON orders (customer_id) WHERE status = 'UNPAID' would be used by which query?</summary>
<p><strong>Correct answer:</strong> SELECT * FROM orders WHERE customer_id = 42 AND status = 'UNPAID'</p>
</details>

<details>
<summary>4. What is the primary advantage of adding columns via INCLUDE in a covering index?</summary>
<p><strong>Correct answer:</strong> The query can be answered from the index alone without reading the table</p>
</details>

<details>
<summary>5. You find an index with idx_scan = 0 in pg_stat_user_indexes. What should you do?</summary>
<p><strong>Correct answer:</strong> Drop it: it adds write overhead and storage cost with no query benefit</p>
</details>
