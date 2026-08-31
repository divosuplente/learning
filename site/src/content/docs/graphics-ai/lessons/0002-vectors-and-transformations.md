---
title: "Vectors — Direction, Magnitude, and 3D Representation"
description: "What vectors are, why they matter in graphics, and how to think about them geometrically — not just as arrays of numbers."
level: beginner
duration: "5 min"
weight: 2
---

## What Is a Vector?

A vector has two things: **direction** and **magnitude** (length). In 3D graphics, we write it as three numbers: `(x, y, z)`.

Think of it as an arrow from the origin to a point in space. The arrow points somewhere (direction) and has a length (magnitude).

```
       y
       ↑
       |
       |    (2, 3, 0)
       |   /
       |  /
       | /
       +--------→ x
      /
     /
    ↓ z
```

## Three Roles in Graphics

Vectors in 3D serve three distinct jobs:

| Role | Example | Has position? |
|------|---------|---------------|
| **Position** | Where a vertex is: `(1, 2, 3)` | Yes — relative to origin |
| **Direction** | Which way light travels: `(0, 1, 0)` = straight up | No — only angle matters |
| **Normal** | Surface orientation: perpendicular to a face | No — only angle matters |

Same data type, different meaning. A **position vector** places an object. A **direction vector** points somewhere. A **normal vector** tells you which way a surface faces.

This distinction matters: rotating a position moves an object. Rotating a direction just points it elsewhere. Translating a position shifts it; translating a direction is meaningless.

## Magnitude

The length of vector `v = (x, y, z)` is:

```
|v| = √(x² + y² + z²)
```

In Python with NumPy:

```python
import numpy as np
v = np.array([3, 4, 0])
length = np.linalg.norm(v)  # 5.0
```

## Vectors in Code

```python
# Two points in 3D
p1 = np.array([0, 0, 0])
p2 = np.array([1, 2, 3])

# Direction from p1 to p2
direction = p2 - p1  # [1, 2, 3]

# Distance between them
distance = np.linalg.norm(direction)  # ≈ 3.74
```

Subtracting two positions gives a direction. Subtracting positions is how you compute "which way is object B from object A" — used constantly in lighting, camera look-at, and collision detection.

## Why It Matters for AI + 3D

- NeRF queries a neural network at a **position** and **viewing direction** — both are vectors
- Point clouds are just lists of position vectors
- SAMv2 segmentation masks map back to 3D via depth vectors
- Every vertex in a mesh is a position vector; every face has a normal vector

## Watch This

[3Blue1Brown — Essence of Linear Algebra, Chapter 1](https://www.3blue1brown.com/topics/linear-algebra) — vectors as arrows, not just columns of numbers. 6 minutes that rewire how you think about them.

---

**Next:** [Matrices as Transformations](./0003-matrices-as-transformations.md)
