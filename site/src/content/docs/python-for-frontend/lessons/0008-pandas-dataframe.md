---
title: "pandas: DataFrames as Typed Spreadsheets"
description: "DataFrame = typed spreadsheet, Series = column, loc vs iloc, and the load-inspect-filter loop you'll run 1000 times."
level: intermediate
duration: "6 min"
weight: 8
---

## What is a DataFrame?

In JS, you'd represent tabular data as `Array<Object>` — but it's untyped, has no built-in aggregation, and filtering means `.filter().map()`. pandas `DataFrame` is a **typed, indexed spreadsheet** with a built-in query engine.

```python
import pandas as pd

# JS equivalent: an array of objects
# const users = [
#   { name: "Alice", age: 30, city: "NYC" },
#   { name: "Bob",   age: 25, city: "LA" },
# ];

users = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dave"],
    "age":  [30, 25, 35, 28],
    "city": ["NYC", "LA", "NYC", "Chicago"],
})
```

**Key difference from `Array<Object>`:** Each column is a `Series` — a typed, contiguous array (backed by NumPy). All values in a column share a dtype. No mixing strings and numbers in the same column.

## Series = one column

```python
import pandas as pd

# A Series is a single typed column with an index
ages = pd.Series([30, 25, 35, 28], name="age")
ages.dtype     # int64
ages.values    # numpy array: [30, 25, 35, 28]
ages.index     # RangeIndex(0, 4) — like row numbers
ages.mean()    # 29.5
ages[ages > 28]  # 0    30
                   # 2    35

# From a DataFrame column
df = pd.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
df["x"]            # Series with name "x"
df[["x", "y"]]     # DataFrame with both columns (note: double bracket!)
```

## Reading data: CSV and JSON

This is where most projects start — load a file, look at it.

```python
import pandas as pd

# Like reading a CSV in JS with fs + papaparse, but built-in
df = pd.read_csv("data.csv")

# From JSON — like JSON.parse then wrapping in DataFrame
df = pd.read_json("data.json")

# Common options you'll use
df = pd.read_csv("data.csv",
    sep=";",           # delimiter (default: comma)
    na_values=["?", "N/A"],  # treat these as NaN
    dtype={"zip": str},      # force column dtype
    parse_dates=["created_at"],  # auto-parse dates
    nrows=1000,        # read only first N rows for exploration
)

# Quick save
df.to_csv("output.csv", index=False)
df.to_json("output.json", orient="records")
```

## First thing: inspect the data

Every data session starts here. This is your `console.table()` + `typeof` check.

```python
import pandas as pd

df = pd.read_csv("data.csv")

df.head()        # first 5 rows — like arr.slice(0, 5) but pretty-printed
df.tail(3)       # last 3 rows
df.shape         # (rows, cols) — like [arr.length, Object.keys(arr[0]).length]
df.columns       # Index(["name", "age", "city"]) — column names
df.dtypes        # type of each column (like TypeScript interface inference)
df.info()        # rows, cols, dtypes, non-null counts, memory usage
df.describe()    # summary stats for numeric columns (count, mean, std, min, quartiles, max)
```

```python
# Example output of df.dtypes — immediately see type problems
# name     object    ← string (Python stores strings as 'object' dtype)
# age       int64
# salary  float64
# zip      object    ← should be string/int? pandas loaded as object
```

## Selecting columns (SQL SELECT)

```python
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol"],
    "age": [30, 25, 35],
    "city": ["NYC", "LA", "NYC"],
})

# Single column → Series (like df.map(r => r.name))
df["name"]

# Multiple columns → DataFrame (like selecting fields from objects)
df[["name", "age"]]

# Column that's a valid Python identifier — dot notation
df.age          # same as df["age"] — but breaks if column name has spaces/special chars
```

## Filtering rows (SQL WHERE)

```python
import pandas as pd

df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dave"],
    "age": [30, 25, 35, 28],
    "city": ["NYC", "LA", "NYC", "Chicago"],
})

# JS: df.filter(r => r.age > 28)
df[df["age"] > 28]              # rows where age > 28

# Compound conditions — & | ~ with parentheses (mandatory!)
# JS: df.filter(r => r.age > 25 && r.city === "NYC")
df[(df["age"] > 25) & (df["city"] == "NYC")]

# .isin — like includes()
# JS: df.filter(r => ["NYC", "LA"].includes(r.city))
df[df["city"].isin(["NYC", "LA"])]

# String contains — like .includes() on strings
df[df["name"].str.contains("a", case=False)]

# Negation
df[~df["city"].isin(["NYC"])]   # everyone NOT in NYC
```

## loc vs iloc: the two ways to slice

This is the #1 pandas confusion point. The difference is simple:

- **`loc`** — label-based (by name). Like `Map.get(key)`.
- **`iloc`** — integer-position-based. Like `Array[index]`.

```python
import pandas as pd

df = pd.DataFrame(
    {"age": [30, 25, 35, 28], "city": ["NYC", "LA", "NYC", "Chicago"]},
    index=["alice", "bob", "carol", "dave"],   # custom row labels
)

# === loc: label-based ===
df.loc["alice"]                   # row by label → Series
df.loc[["alice", "carol"]]       # multiple rows by label
df.loc["alice", "age"]           # row label + column label → scalar
df.loc[:, "age"]                  # all rows, "age" column
df.loc["alice":"carol", "age"]   # slice inclusive by label! (both ends)

# === iloc: position-based (like JS array indexing) ===
df.iloc[0]                        # first row → Series (like arr[0])
df.iloc[[0, 2]]                   # rows 0 and 2
df.iloc[0, 0]                     # row 0, col 0 → scalar
df.iloc[:, 0]                     # all rows, first column
df.iloc[0:2, 0]                   # slice exclusive by position (like JS slice)

# KEY DIFFERENCE:
# loc["a":"c"] is INCLUSIVE of both ends
# iloc[0:2]   is EXCLUSIVE of the end (like JS/Python slicing)
```

**When to use which:** `loc` when you know labels (column names, meaningful index values). `iloc` when you know positions (first N rows, every other column). Default to `loc` — it's self-documenting.

## Adding and modifying columns

```python
import pandas as pd

df = pd.DataFrame({"price": [10, 20, 30], "qty": [1, 2, 3]})

# New column — like arr.map(r => ({...r, total: r.price * r.qty}))
df["total"] = df["price"] * df["qty"]       # vectorized, no loop

# Conditional column — like arr.map(r => ({...r, tier: r.price > 15 ? "high" : "low"}))
import numpy as np
df["tier"] = np.where(df["price"] > 15, "high", "low")

# Modify in place
df["price"] = df["price"] * 1.1   # 10% increase
```

## Quick reference

| JS / SQL | pandas |
|---------|--------|
| `arr.slice(0, 5)` | `df.head()` |
| `typeof x` per column | `df.dtypes` |
| `arr.filter(r => r.x > 5)` | `df[df["x"] > 5]` |
| `arr.map(r => r.name)` | `df["name"]` |
| `arr.filter(...).map(r => r.x)` | `df.loc[mask, "x"]` |
| `SQL: SELECT name, age FROM t` | `df[["name", "age"]]` |
| `SQL: WHERE city='NYC'` | `df[df["city"] == "NYC"]` |
| `arr[0]` | `df.iloc[0]` |
| `map.get(key)` | `df.loc[key]` |

## Practice

1. Load a CSV with `pd.read_csv`. Run `.head()`, `.dtypes`, `.describe()`. Identify at least one column with a wrong dtype.
2. Filter a DataFrame to rows where a numeric column is above its median and a string column matches one of three values.
3. Select rows 5–15, columns `["name", "age"]` using both `loc` and `iloc`. Explain why the slice end behavior differs.

Next: [0009 — pandas: GroupBy, Merge, and Transform](./0009-pandas-groupby-merge.md)
