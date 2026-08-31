---
title: "pandas: GroupBy, Merge, and Transform"
description: "groupby = SQL GROUP BY, merge = JOIN, apply = .map(), NaN handling, and pivot tables."
level: intermediate
duration: "7 min"
weight: 9
---

# pandas: GroupBy, Merge, and Transform

## groupby: SQL GROUP BY + HAVING

```python
import pandas as pd

orders = pd.DataFrame({
    "customer": ["Alice", "Bob", "Alice", "Carol", "Bob", "Alice"],
    "product":  ["A", "B", "A", "C", "B", "C"],
    "amount":   [100, 200, 50, 300, 150, 80],
})

# SQL: SELECT customer, SUM(amount) FROM orders GROUP BY customer
orders.groupby("customer")["amount"].sum()
# Alice    230
# Bob      350
# Carol    300

# Multiple aggregations
# SQL: SELECT customer, COUNT(*), SUM(amount), AVG(amount)
orders.groupby("customer")["amount"].agg(["count", "sum", "mean"])
#          count   sum   mean
# Alice        3   230  76.67
# Bob          2   350  175.0
# Carol        1   300  300.0

# Group by multiple columns — like GROUP BY customer, product
orders.groupby(["customer", "product"])["amount"].sum()
# customer  product
# Alice     A          150
#           C           80
# Bob       B          350
# Carol     C          300

# Named aggregations — clean column names in result
orders.groupby("customer").agg(
    total=("amount", "sum"),
    avg_amount=("amount", "mean"),
    num_orders=("amount", "count"),
)

# HAVING equivalent — filter groups after aggregation
grouped = orders.groupby("customer")["amount"].sum()
grouped[grouped > 250]    # Bob: 350, Carol: 300
```

**JS equivalent:** `Object.entries(arr.reduce((acc, r) => ...))` — but pandas does it in C, handles edge cases, and returns a typed DataFrame instead of nested objects.

## merge: SQL JOIN

```python
import pandas as pd

users = pd.DataFrame({
    "uid": [1, 2, 3],
    "name": ["Alice", "Bob", "Carol"],
})

purchases = pd.DataFrame({
    "uid": [1, 1, 2, 4],
    "item": ["Book", "Pen", "Book", "Hat"],
    "price": [10, 2, 10, 25],
})

# INNER JOIN — only matching rows from both sides
# SQL: SELECT * FROM users u JOIN purchases p ON u.uid = p.uid
pd.merge(users, purchases, on="uid", how="inner")
#    uid   name  item  price
# 0   1  Alice  Book     10
# 1   1  Alice   Pen      2
# 2   2    Bob  Book     10

# LEFT JOIN — all rows from left, matching from right
# Carol has no purchases → NaN for item/price
# uid=4 has purchase but no user → excluded
pd.merge(users, purchases, on="uid", how="left")
#    uid   name  item  price
# 0   1  Alice  Book     10
# 1   1  Alice   Pen      2
# 2   2    Bob  Book     10
# 3   3  Carol   NaN    NaN

# RIGHT JOIN — all rows from right
pd.merge(users, purchases, on="uid", how="right")
# uid=4 (Hat, 25) included, name is NaN

# OUTER JOIN — all rows from both
pd.merge(users, purchases, on="uid", how="outer")

# Different column names for the key
# pd.merge(df1, df2, left_on="user_id", right_on="uid", how="inner")
```

**JS equivalent:** There's no native JOIN. You'd write nested loops or build lookup Maps. pandas does hash-join in C.

## apply: .map() for rows and columns

```python
import pandas as pd

df = pd.DataFrame({
    "first": ["alice", "bob", "carol"],
    "last": ["smith", "jones", "white"],
})

# Element-wise — like arr.map(x => x.toUpperCase())
df["first"].str.capitalize()  # built-in string method, faster
# Same with apply:
df["first"].apply(str.capitalize)     # element-wise function

# Row-wise — like arr.map(r => r.first + " " + r.last)
df["full"] = df.apply(lambda row: f"{row['first']} {row['last']}", axis=1)

# BUT: prefer vectorized ops over apply when possible
df["full"] = df["first"] + " " + df["last"]  # vectorized, much faster
```

**Rule of thumb:** If there's a vectorized way (`+`, `.str`, NumPy), use it. `apply` is for logic that can't be expressed as a bulk operation. It's still a Python-level loop under the hood — just cleaner syntax.

## NaN: the Python null problem

JS has `null` and `undefined`. Python has `None`. pandas has `NaN` (Not a Number) — a float that means "missing data." It infects every math operation.

```python
import pandas as pd
import numpy as np

s = pd.Series([1, np.nan, 3, np.nan, 5])

# pandas actually handles NaN gracefully by default:
s.sum()                 # 9.0  — skipna=True is the default!
s.mean()                # 3.0  — also skips NaN by default

# But NaN still propagates in arithmetic:
s + 1                   # [2.0, NaN, 4.0, NaN, 6.0] — NaN + 1 = NaN

# You can force include NaN (rarely useful):
s.sum(skipna=False)     # NaN — one NaN poisons the whole sum

# Find and count NaN
s.isna()              # [False, True, False, True, False]
s.isna().sum()        # 2

# Drop NaN rows
s.dropna()            # [1.0, 3.0, 5.0]

# Fill NaN
s.fillna(0)           # [1.0, 0.0, 3.0, 0.0, 5.0]
s.fillna(s.mean())    # fill with the mean of non-NaN values

# In a DataFrame
df = pd.DataFrame({"x": [1, np.nan, 3], "y": [np.nan, 5, 6]})
df.dropna()            # drops rows with ANY NaN
df.dropna(subset=["x"])  # only drop rows where x is NaN
df.fillna({"x": 0, "y": -1})  # per-column fill values
```

**JS parallel:** `NaN` in pandas is like `null` in a typed TS array — you have to decide what to do with missing values before you compute. Unlike JS where `null + 1` is sometimes okay, pandas `NaN + 1` is always `NaN`.

## Pivot tables

```python
import pandas as pd

sales = pd.DataFrame({
    "region": ["East", "East", "West", "West", "East", "West"],
    "product": ["A", "B", "A", "B", "A", "A"],
    "quarter": ["Q1", "Q1", "Q1", "Q1", "Q2", "Q2"],
    "revenue": [100, 200, 150, 250, 120, 180],
})

# Like a spreadsheet pivot: rows=region, columns=product, values=revenue
pd.pivot_table(sales, values="revenue", index="region", columns="product", aggfunc="sum")
# product    A    B
# region
# East     220  200
# West     330  250

# Multiple aggregation functions
pd.pivot_table(sales, values="revenue", index="region",
               columns="quarter", aggfunc=["sum", "mean"])

# Margins — add row/column totals (like spreadsheet grand total)
pd.pivot_table(sales, values="revenue", index="region",
               columns="product", aggfunc="sum", margins=True)
```

**When to use:** Pivot tables are your "reshape for reporting" tool — rotate rows into columns for comparison. The ML equivalent is feature cross-tabulation before encoding.

## Quick reference

| SQL / JS | pandas |
|---------|--------|
| `GROUP BY col` | `df.groupby("col")` |
| `HAVING COUNT(*) > 5` | `grouped.filter(lambda x: len(x) > 5)` |
| `INNER JOIN t2 ON t1.id = t2.id` | `pd.merge(df1, df2, on="id")` |
| `LEFT JOIN` | `pd.merge(df1, df2, on="id", how="left")` |
| `arr.map(fn)` | `df["col"].apply(fn)` |
| `arr.filter(x => x != null)` | `s.dropna()` |
| `arr.map(x => x ?? 0)` | `s.fillna(0)` |
| Spreadsheet pivot | `pd.pivot_table(df, ...)` |

## Practice

1. Group a sales dataset by region and category, computing sum and mean of revenue. Filter to groups with more than 3 rows.
2. Inner-join a users table and an orders table on `user_id`. Find users with no orders using a left join + `isna()` check.
3. Given a DataFrame with NaN values in a numeric column, fill with the column median and verify no NaN remains.

Next: [0010 — The Data Pipeline: NumPy ↔ pandas ↔ Matplotlib](./0010-data-pipeline.md)
