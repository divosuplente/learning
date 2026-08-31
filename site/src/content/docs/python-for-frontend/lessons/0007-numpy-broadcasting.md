---
title: "NumPy: Broadcasting and Advanced Indexing"
description: "Broadcasting rules, boolean/fancy indexing, np.where/argmax/argsort — the ops you'll use every day in ML."
level: intermediate
duration: "7 min"
weight: 7
---

## Broadcasting: how NumPy stretches arrays without copying

In JS, adding arrays element-wise requires `.map()` or a loop. In NumPy, `a + b` works even when `a` and `b` have **different shapes** — NumPy "broadcasts" the smaller one.

**The rule:** compare shapes right-to-left. Dimensions are compatible when they're equal, or one of them is 1.

```python
import numpy as np

# Shape (3,) + scalar → scalar broadcast to (3,)
np.array([1, 2, 3]) + 10       # [11, 12, 13]

# Shape (3, 1) + (1, 3) → both broadcast to (3, 3)
col = np.array([[1], [2], [3]])   # shape (3, 1)
row = np.array([[10, 20, 30]])    # shape (1, 3)
col + row
# [[11, 21, 31],
#  [12, 22, 32],
#  [13, 23, 33]]
```

**JS equivalent mental model:** broadcasting is like how JS `+` coerces `"5" + 3` by auto-converting, but for entire arrays and without mutation. The result shape is the **element-wise max** of both input shapes.

### The algorithm, step by step

```python
# Example: (4, 1) + (3,) → ?
a = np.ones((4, 1))    # shape (4, 1)
b = np.arange(3)       # shape (3,)

# Step 1: pad shorter shape with 1s on the left → (1, 3)
# Step 2: compare right-to-left:
#   last dim:  1 vs 3 → 3 wins (1 stretches to 3)
#   first dim: 4 vs 1 → 4 wins (1 stretches to 4)
# Step 3: result shape = (4, 3)

a + b  # shape (4, 3) — no data copied, computed on the fly
```

### Broadcasting failures

```python
# Incompatible shapes — neither dimension is 1 or equal
a = np.ones((3, 4))
b = np.ones((3, 3))
# a + b  → ValueError: operands could not be broadcast together

# Fix: reshape one to align
a + b[:, :1]   # (3, 4) + (3, 1) → (3, 4) ✓
```

## Boolean indexing: filtering without `.filter()`

```python
import numpy as np

scores = np.array([72, 55, 91, 43, 88, 67])

# JS: scores.filter(x => x >= 70)
# NumPy:
mask = scores >= 70                     # [True, False, True, False, True, False]
passing = scores[mask]                  # [72, 91, 88]

# One-liner
scores[scores >= 70]                    # same result

# Combine conditions — use & | ~ instead of && || !
mid = (scores >= 60) & (scores < 80)    # & not `and`
scores[mid]                             # [72, 67]

# Count matches
(scores >= 70).sum()                    # 3  — True=1, False=0
```

**Gotcha:** Use `&`, `|`, `~` with NumPy boolean arrays. Python's `and`/`or`/`not` raise errors because they try to evaluate truthiness of the whole array, which is ambiguous.

## Fancy indexing: pick specific positions

```python
import numpy as np

names = np.array(["alice", "bob", "carol", "dave"])

# Pick by index array — like names.filter((_, i) => [0,2].includes(i))
names[[0, 2]]              # ["alice", "carol"]

# Reorder
names[[3, 1, 0, 2]]       # ["dave", "bob", "alice", "carol"]

# 2D: pick specific rows and columns
data = np.arange(12).reshape(3, 4)
# [[ 0,  1,  2,  3],
#  [ 4,  5,  6,  7],
#  [ 8,  9, 10, 11]]

data[[0, 2], [1, 3]]       # [1, 11]  ← (0,1) and (2,3)
# Like JS: [data[0][1], data[2][3]]
```

**Important:** Fancy indexing **copies** data (unlike slicing which returns a view). If you need to modify the original, assign back to the fancy-indexed position.

## np.where, np.argmax, np.argsort

These three replace common loop-and-compare patterns.

```python
import numpy as np

arr = np.array([3, -1, 4, -1, 5])

# np.where — like JS ternary but vectorized
# JS: arr.map(x => x >= 0 ? x : 0)
np.where(arr >= 0, arr, 0)           # [3, 0, 4, 0, 5]

# Just the indices (no values) — like finding positions
np.where(arr < 0)                     # (array([1, 3]),)

# np.argmax / np.argmin — index of max/min
# JS: arr.indexOf(Math.max(...arr))
np.argmax(arr)                         # 4  (value 5)
np.argmin(arr)                         # 1  (value -1)

# Along an axis
data = np.array([[1, 7, 3],
                 [9, 2, 5]])
np.argmax(data, axis=1)               # [1, 0]  ← max col index per row

# np.argsort — indices that would sort the array
# JS: arr.map((v,i) => i).sort((a,b) => arr[a] - arr[b])
np.argsort(arr)                        # [1, 3, 0, 2, 4]
arr[np.argsort(arr)]                   # [-1, -1, 3, 4, 5]  ← sorted

# Top-k: get the k largest values
k = 2
top_k_idx = np.argsort(arr)[-k:]      # [2, 4]
arr[top_k_idx]                         # [4, 5]
```

## ML preprocessing patterns

These are the operations you'll reach for constantly when preparing data for models.

```python
import numpy as np

# Mean normalization — like (x - mean) / std in feature scaling
features = np.array([[1.0, 200.0],
                     [2.0, 300.0],
                     [3.0, 400.0]])
mean = features.mean(axis=0)     # per-column mean
std = features.std(axis=0)       # per-column std
normalized = (features - mean) / std
# [[-1., -1.], [0., 0.], [1., 1.]]

# One-hot encoding — like converting a category to binary columns
# JS: categories.map(c => Array(n).fill(0).map((_, i) => i === c ? 1 : 0))
labels = np.array([0, 2, 1, 0])
n_classes = 3
one_hot = np.eye(n_classes)[labels]
# [[1, 0, 0],
#  [0, 0, 1],
#  [0, 1, 0],
#  [1, 0, 0]]

# Clip values — like Math.min(Math.max(x, lo), hi) but vectorized
raw = np.array([-5, 0.1, 0.9, 2.0])
np.clip(raw, 0, 1)               # [0, 0.1, 0.9, 1.0]
```

## Quick reference

| JS pattern | NumPy |
|-----------|-------|
| `arr.filter(x => x > 0)` | `arr[arr > 0]` |
| `arr.map(x => cond ? a : b)` | `np.where(cond, a, b)` |
| `arr.indexOf(Math.max(...arr))` | `np.argmax(arr)` |
| `indices.sort((a,b) => arr[a]-arr[b])` | `np.argsort(arr)` |
| `arr.map((v,i) => v + other[i])` | `arr + other` (broadcast if needed) |
| `(x - mean) / std` per column | `(arr - arr.mean(0)) / arr.std(0)` |

## Practice

1. Given a (5, 3) matrix, normalize each column to zero mean and unit variance using broadcasting.
2. Implement one-hot encoding for `[2, 0, 1, 1]` with 3 classes using `np.eye`.
3. Find the top-3 values and their indices in `np.random.default_rng(0).random(10)` using `np.argsort`.

Next: [0008 — pandas: DataFrames as Typed Spreadsheets](0008-pandas-dataframe/)
