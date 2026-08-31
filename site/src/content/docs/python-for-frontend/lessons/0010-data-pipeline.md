---
title: "The Data Pipeline: NumPy ↔ pandas ↔ Matplotlib"
description: Load with pandas → transform with NumPy → visualize with Matplotlib. The end-to-end workflow before every ML project.
level: intermediate
duration: "7 min"
weight: 10
---

## The three-layer workflow

Every ML project starts the same way:

1. **Load** data with pandas (CSV, JSON, database)
2. **Transform** with NumPy (normalize, reshape, compute)
3. **Visualize** with Matplotlib (distributions, correlations, sanity checks)

These three libraries pass data through each other seamlessly.

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
```

## pandas ↔ NumPy: zero-copy bridge

```python
import pandas as pd
import numpy as np

# DataFrame → NumPy array
df = pd.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
arr = df.values              # np.array([[1,4],[2,5],[3,6]]) — float64
arr = df.to_numpy()          # same, preferred method name

# NumPy array → DataFrame
arr = np.array([[1, 4], [2, 5], [3, 6]])
df = pd.DataFrame(arr, columns=["x", "y"])

# Single column → 1D array
df["x"].to_numpy()           # array([1, 2, 3])

# This is NOT a copy — modifying the array can affect the DataFrame
# Use .copy() if you need independence
arr = df.to_numpy().copy()
```

**When to use which:** pandas for labeled operations (column names, groupby, merge). NumPy for math (matrix ops, broadcasting, linear algebra). The `.values`/`.to_numpy()` bridge is free — no parsing or copying if dtypes align.

## The plt interface: matplotlib's "jQuery for charts"

Matplotlib has two APIs. You want `pyplot` (`plt`) — the simple, state-based one. Think of it like jQuery: you call functions that modify the current figure, then call `plt.show()`.

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2 * np.pi, 100)
y = np.sin(x)

plt.plot(x, y)              # line chart — like <Line> in Recharts
plt.title("Sine wave")
plt.xlabel("x")
plt.ylabel("sin(x)")
plt.show()                  # render — in Jupyter this is automatic
```

## The four charts you'll use constantly

### Histogram: distribution of one variable

```python
import matplotlib.pyplot as plt
import numpy as np

data = np.random.default_rng(42).standard_normal(1000)

plt.hist(data, bins=30, edgecolor="white")
plt.title("Distribution of values")
plt.xlabel("Value")
plt.ylabel("Count")
plt.show()
```

**JS equivalent:** `d3.bin()` + `d3.histogram()`, or Recharts `<BarChart>`. Matplotlib does the binning for you.

### Scatter: relationship between two variables

```python
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
x = rng.random(100)
y = 2 * x + rng.standard_normal(100) * 0.3

plt.scatter(x, y, alpha=0.7, s=20)   # alpha=transparency, s=dot size
plt.title("X vs Y correlation")
plt.xlabel("X")
plt.ylabel("Y")
plt.show()
```

### Bar chart: comparing categories

```python
import matplotlib.pyplot as plt

categories = ["A", "B", "C", "D"]
values = [15, 30, 25, 10]

plt.bar(categories, values)
plt.title("Category comparison")
plt.ylabel("Count")
plt.show()

# Horizontal bars
plt.barh(categories, values)
plt.show()
```

### Subplots: multiple charts in one figure

```python
import matplotlib.pyplot as plt
import numpy as np

rng = np.random.default_rng(42)
data = rng.standard_normal(500)

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# Left: histogram
axes[0].hist(data, bins=30, edgecolor="white")
axes[0].set_title("Distribution")

# Right: cumulative distribution
sorted_data = np.sort(data)
axes[1].plot(sorted_data, np.arange(len(sorted_data)) / len(sorted_data))
axes[1].set_title("CDF")

plt.tight_layout()   # prevent label overlap
plt.show()
```

**JS equivalent:** `fig` ≈ `<div>` container, `axes` ≈ chart instances, `plt.subplots()` ≈ CSS grid layout, `tight_layout()` ≈ auto-margin.

## End-to-end pipeline

Here's the complete workflow you'll run before training any model on tabular data:

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# 1. LOAD
df = pd.read_csv("housing.csv")
print(df.shape)           # (rows, cols)
print(df.dtypes)          # column types
print(df.describe())      # summary stats

# 2. CLEAN
# Drop rows with missing target
df = df.dropna(subset=["price"])

# Fill other NaNs with median
for col in df.select_dtypes(include=[np.number]).columns:
    df[col] = df[col].fillna(df[col].median())

# Remove obvious outliers — clip to 1st/99th percentile
for col in ["price", "sqft"]:
    lo, hi = df[col].quantile([0.01, 0.99])
    df[col] = df[col].clip(lo, hi)

# 3. FEATURE ENGINEER
# Normalization — NumPy broadcasting on pandas columns
price = df["price"].to_numpy()
sqft = df["sqft"].to_numpy()
df["price_per_sqft"] = price / sqft

# Log transform for skewed distributions
df["log_price"] = np.log1p(df["price"])

# 4. VISUALIZE
fig, axes = plt.subplots(1, 3, figsize=(15, 4))

axes[0].hist(df["price"], bins=40, edgecolor="white")
axes[0].set_title("Price distribution")

axes[1].scatter(df["sqft"], df["price"], alpha=0.3, s=8)
axes[1].set_xlabel("Sqft")
axes[1].set_ylabel("Price")
axes[1].set_title("Price vs Sqft")

df.groupby("neighborhood")["price"].mean().plot.bar(ax=axes[2])
axes[2].set_title("Avg price by neighborhood")
axes[2].set_ylabel("Price")

plt.tight_layout()
plt.savefig("analysis.png", dpi=150)   # save to disk
plt.show()

# 5. EXTRACT for ML — DataFrame → NumPy array
feature_cols = ["sqft", "bedrooms", "bathrooms"]
X = df[feature_cols].to_numpy()     # shape (n_samples, n_features)
y = df["price"].to_numpy()          # shape (n_samples,)
```

## Saving figures

```python
import matplotlib.pyplot as plt

plt.plot([1, 2, 3], [1, 4, 9])

# Save before show — plt.show() clears the figure
plt.savefig("chart.png", dpi=150, bbox_inches="tight")

# Other formats
plt.savefig("chart.pdf")   # vector, good for papers
plt.savefig("chart.svg")   # vector, good for web

# In Jupyter: %matplotlib inline renders below the cell automatically
# In scripts: always call plt.show() or plt.savefig()
```

## Quick reference

| Step | Tool | Key function |
|------|------|-------------|
| Load CSV | pandas | `pd.read_csv()` |
| Inspect | pandas | `.head()`, `.describe()`, `.dtypes` |
| Clean | pandas + NumPy | `.dropna()`, `.fillna()`, `.clip()`, `np.log1p()` |
| Transform | NumPy | `.to_numpy()`, broadcasting, `np.where()` |
| Back to DataFrame | pandas | `pd.DataFrame(arr, columns=...)` |
| Histogram | matplotlib | `plt.hist()` |
| Scatter | matplotlib | `plt.scatter()` |
| Bar | matplotlib | `plt.bar()` / `.plot.bar()` |
| Subplots | matplotlib | `plt.subplots()` |
| Save | matplotlib | `plt.savefig()` |

## Practice

1. Load any CSV dataset. Print shape, dtypes, and describe. Identify one cleaning step needed.
2. Compute a new column from two existing ones using NumPy operations on `.to_numpy()`. Put it back in the DataFrame.
3. Create a 3-plot figure: histogram of one column, scatter of two columns, bar chart of group means. Save to PNG.

Next: [0011 — Tensors: NumPy with Superpowers](./0011-tensors-numpy-with-superpowers.md)
