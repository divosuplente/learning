---
title: "NumPy: The Array That Changed Python"
description: "Why Python lists are slow, how ndarray fixes it, and vectorized ops that replace every for-loop."
level: intermediate
duration: "6 min"
weight: 6
---

## Why not just use lists?

In JS, a `Float64Array` is faster than a plain `Array` for math because it's **typed and contiguous in memory**. Python's `list` has the same problem as JS `Array` — every element is a boxed object reference, scattered across the heap.

```python
# Python list: each element is a full Python object (type tag, refcount, value)
nums = [1.0, 2.0, 3.0]  # ~24 bytes per float + object overhead

# NumPy ndarray: one contiguous C buffer of raw doubles
import numpy as np
arr = np.array([1.0, 2.0, 3.0])  # 8 bytes per float, no overhead
```

**The JS parallel:** `list` ≈ `Array`, `ndarray` ≈ `Float64Array` — but `ndarray` is n-dimensional and has a full math library.

Speed difference on a million elements:

```python
import numpy as np

py_list = list(range(1_000_000))
np_arr = np.arange(1_000_000)

# Python loop — interpreted per element
# [x * 2 for x in py_list]          # ~80ms

# NumPy vectorized — C-level bulk op
# np_arr * 2                         # ~2ms
```

That's ~40x. Every ML library in Python (pandas, PyTorch, scikit-learn) builds on NumPy because of this speed.

## The ndarray: shape, dtype, axes

```python
import numpy as np

# 1D — like a typed JS Array
a = np.array([1, 2, 3])
a.shape    # (3,)      ← like .length
a.dtype    # int64     ← every element is this type
a.ndim     # 1         ← number of axes

# 2D — like a typed matrix (no JS equivalent; JS needs nested arrays)
b = np.array([[1, 2, 3],
              [4, 5, 6]])
b.shape    # (2, 3)    ← 2 rows, 3 columns
b.ndim     # 2

# 3D — like a stack of matrices (think: batch of images)
c = np.zeros((4, 28, 28))  # 4 images, 28×28 pixels
c.shape    # (4, 28, 28)
c.ndim     # 3
```

**Key difference from JS:** A JS "2D array" is `Array<Array<number>>` — rows are separate objects, no guarantee of uniform length. An `ndarray` is one contiguous memory block with a fixed shape. No ragged arrays.

## Creating arrays

```python
import numpy as np

# From Python list
np.array([1, 2, 3])

# Sequences — like Array.from({length: 5}, (_, i) => i)
np.arange(5)             # [0, 1, 2, 3, 4]
np.arange(0, 1, 0.2)    # [0.0, 0.2, 0.4, 0.6, 0.8]

# Filled arrays
np.zeros((2, 3))         # [[0., 0., 0.], [0., 0., 0.]]
np.ones(4)               # [1., 1., 1., 1.]
np.full((2, 2), 7)       # [[7, 7], [7, 7]]

# Random — like Math.random() but vectorized
np.random.default_rng(42).random((2, 3))  # reproducible 2×3 array

# Linspace — evenly spaced (useful for plot x-axes)
np.linspace(0, 1, 5)     # [0.0, 0.25, 0.5, 0.75, 1.0]
```

## Indexing and slicing (multi-dimensional!)

JS only has 1D arrays. Nested arrays mean `arr[i][j]` — two separate lookups. NumPy does **multi-dimensional slicing in one operation:**

```python
import numpy as np

a = np.arange(12).reshape(3, 4)
# [[ 0,  1,  2,  3],
#  [ 4,  5,  6,  7],
#  [ 8,  9, 10, 11]]

# JS equivalent of a[i][j], but faster and more powerful
a[1, 2]        # 6         ← row 1, col 2 (like a[1][2] in JS)

# Row slice — first two rows, all columns
a[:2, :]       # [[0,1,2,3], [4,5,6,7]]

# Column slice — all rows, cols 1-2
a[:, 1:3]      # [[1,2], [5,6], [9,10]]

# Every other column
a[:, ::2]      # [[0,2], [4,6], [8,10]]

# Single row → 1D result (dimension is dropped!)
a[1, :]        # [4, 5, 6, 7]   shape (4,)
a[1:2, :]      # [[4, 5, 6, 7]] shape (1, 4)  ← keep dimension
```

**JS comparison:** `arr.slice(1, 3)` works for 1D only. There's no native multi-dimensional slice. In NumPy, `a[:2, 1:3]` is one C-level operation — no intermediate arrays created.

## Vectorized operations: no loops needed

The single most important NumPy habit: **never write a for-loop over array elements.**

```python
import numpy as np

prices = np.array([19.99, 29.99, 9.99, 49.99])

# ❌ Python-loop style (slow, un-Pythonic)
# discounted = []
# for p in prices:
#     discounted.append(p * 0.9)

# ✅ Vectorized — one C-level operation on the whole array
discounted = prices * 0.9   # [17.991, 26.991, 8.991, 44.991]

# Element-wise ops work like you'd expect from JS mapped arrays
# but without the .map()
prices + 5          # add 5 to every element
prices * 2          # double every element
prices > 20         # [False, True, False, True]  ← boolean array

# Two arrays — element-wise (like JS: a.map((v, i) => v + b[i]))
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])
a + b    # [5, 7, 9]
a * b    # [4, 10, 18]

# Axis-wise reductions — the "direction" of the operation
matrix = np.array([[1, 2, 3],
                   [4, 5, 6]])

matrix.sum()          # 21          ← all elements
matrix.sum(axis=0)    # [5, 7, 9]  ← sum down each column
matrix.sum(axis=1)    # [6, 15]    ← sum across each row
matrix.mean(axis=0)   # [2.5, 3.5, 4.5]
```

**Mental model for `axis`:** `axis=0` collapses rows (operate down columns), `axis=1` collapses columns (operate across rows). The axis you name is the one that **disappears** from the result shape.

## dtype matters

```python
import numpy as np

# Default dtype depends on input
np.array([1, 2, 3]).dtype       # int64
np.array([1.0, 2.0]).dtype     # float64
np.array([1, 2.0]).dtype       # float64  ← upcast to float

# Explicit dtype — like new Float64Array() vs new Int32Array()
np.array([1, 2, 3], dtype=np.float32)
np.array([0, 1, 2], dtype=np.bool_)  # [False, True, True]

# Cast after creation
arr = np.array([1.7, 2.3, 3.9])
arr.astype(np.int32)  # [1, 2, 3]  ← truncates, like Math.trunc
```

## Quick reference

| JS | NumPy |
|----|-------|
| `new Float64Array([1,2,3])` | `np.array([1.,2.,3.])` |
| `arr.length` | `arr.shape` |
| `arr[i]` | `arr[i]` (1D) or `arr[i,j]` (2D+) |
| `arr.slice(1,3)` | `arr[1:3]` |
| `arr.map(x => x*2)` | `arr * 2` |
| `arr.filter(x => x > 0)` | `arr[arr > 0]` |
| `arr.reduce((s,x) => s+x, 0)` | `arr.sum()` |
| — | `arr.sum(axis=0)` |

## Practice

1. Create a 4×6 array of random floats. Slice rows 1–2, columns 2–4.
2. Replace the loop: convert `[x**2 for x in range(100)]` to a vectorized operation.
3. Given a 3×4 matrix, compute the mean of each row and each column using `axis`.

Next: [0007 — NumPy: Broadcasting and Advanced Indexing](0007-numpy-broadcasting/)
