---
title: Matrices — Transformations as Function Calls
description: "A matrix is not a spreadsheet — it's a function that transforms vectors. Rotate, scale, and project by multiplying."
level: beginner
duration: "5 min"
weight: 3
---

## The Key Insight

A matrix is a **function**. When you multiply a matrix by a vector, you're calling that function on the vector — it returns a transformed vector.

```
matrix × vector = new vector
  f()     x     = f(x)
```

Algebraically it's rows and columns of number-crunching. Geometrically it's: stretch, rotate, shear, or project the space.

## What a Matrix Does

A 3×3 matrix transforms a 3D vector. The columns of the matrix tell you where each axis lands:

```
Rotation matrix (90° around Y):
       ┌              ┐
       │  0   0   1   │    X-axis → lands at Z
       │  0   1   0   │    Y-axis → stays at Y
       │ -1   0   0   │    Z-axis → lands at -X
       └              ┘
```

Multiply this matrix by vector `(1, 0, 0)` (the X-axis unit vector) and you get `(0, 0, -1)`. The matrix *moved* the X-axis to where Z was pointing.

## Common Transformations

| Transform | What it does | Example use |
|-----------|-------------|-------------|
| **Rotation** | Spins around an axis | Camera orbiting a scene |
| **Scale** | Stretches or shrinks along axes | Resizing a 3D model |
| **Translation** | Moves to a new position | Placing an object in the world |
| **Projection** | Flattens 3D → 2D | Rendering to screen |

## Why 4×4? (Homogeneous Coordinates)

Translation is a problem. A 3×3 matrix can rotate and scale, but can't move the origin — matrix multiplication always maps zero to zero.

The fix: add a fourth coordinate. A 3D point `(x, y, z)` becomes `(x, y, z, 1)`. Now a 4×4 matrix can encode translation in the last column:

```
┌                ┐   ┌   ┐    ┌                    ┐
│ 1  0  0  tx    │   │ x │    │ x + tx             │
│ 0  1  0  ty    │ × │ y │  = │ y + ty             │
│ 0  0  1  tz    │   │ z │    │ z + tz             │
│ 0  0  0  1     │   │ 1 │    │ 1                  │
└                ┘   └   ┘    └                    ┘
```

The `w=1` trick makes translation a matrix multiplication instead of a separate addition. Now **every** transform — rotate, scale, translate, project — is one matrix multiply. Composing transforms is just multiplying matrices together.

You don't need to derive these matrices by hand. You just need to know: **a 4×4 matrix packs rotation + scale + translation into one operation**, and GPUs are built to multiply matrices fast.

## Matrix × Vector in Code

```python
import numpy as np

# A 90° rotation around Z-axis
R = np.array([
    [0, -1, 0],
    [1,  0, 0],
    [0,  0, 1]
])

v = np.array([1, 0, 0])  # point on X-axis
result = R @ v            # [0, 1, 0] — now on Y-axis
```

The `@` operator in Python is matrix multiplication. `R @ v` means "apply transformation R to vector v."

## Composing Transforms

Want to rotate **then** translate? Multiply the matrices:

```python
T = np.array([           # translate by (5, 0, 0)
    [1, 0, 0, 5],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
])

R_4x4 = np.eye(4)       # embed rotation in 4×4
R_4x4[:3, :3] = R

combined = T @ R_4x4     # rotate first, then translate
```

Order matters. `T @ R` is "rotate then translate." `R @ T` is "translate then rotate" — different result. This is why transform order in game engines matters.

---

**Next:** [Coordinate Systems](0004-coordinate-systems/)
