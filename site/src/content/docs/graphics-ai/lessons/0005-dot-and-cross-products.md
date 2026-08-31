---
title: "Dot & Cross Products — Lighting, Normals, and Angles"
description: "Two operations on vectors that power almost every graphics calculation: dot product for angles and lighting, cross product for normals and perpendicular directions."
level: beginner
duration: "5 min"
weight: 5
---

## Dot Product — "How Aligned Are These Vectors?"

The dot product of two vectors tells you how much they point in the same direction:

```
a · b = |a| × |b| × cos(θ)
```

Or in coordinates: `a · b = ax×bx + ay×by + az×bz`

What the result means:

| Dot product | Angle between vectors |
|-------------|----------------------|
| **> 0** | Less than 90° — pointing roughly same way |
| **= 0** | Exactly 90° — perpendicular |
| **< 0** | More than 90° — pointing roughly opposite |

### Why this matters: lighting

The simplest lighting model (Lambertian diffuse) is just a dot product:

```python
# Direction from surface to light
light_dir = normalize(light_pos - surface_pos)

# Surface normal (perpendicular to the surface)
normal = normalize(surface_normal)

# Diffuse lighting = how much the surface faces the light
brightness = max(0, np.dot(normal, light_dir))
```

If the normal points toward the light, the dot product is positive → bright. If the normal points away, the dot product goes negative → clamped to 0 (dark). That's it. Half of real-time lighting is dot products.

### Another use: angle between vectors

```python
def angle_between(a, b):
    cos_theta = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    return np.arccos(np.clip(cos_theta, -1, 1))
```

## Cross Product — "Give Me Something Perpendicular"

The cross product of two 3D vectors produces a new vector perpendicular to both:

```
a × b = perpendicular vector
```

The length of the result equals `|a| × |b| × sin(θ)` — it's largest when the inputs are perpendicular, zero when they're parallel.

### Why this matters: normals

A triangle's face normal is the cross product of two of its edges:

```python
# Three vertices of a triangle
v0, v1, v2 = np.array([0,0,0]), np.array([1,0,0]), np.array([0,1,0])

# Two edges
edge1 = v1 - v0  # [1, 0, 0]
edge2 = v2 - v0  # [0, 1, 0]

# Normal (perpendicular to the triangle)
normal = np.cross(edge1, edge2)  # [0, 0, 1] — pointing up
```

Without the cross product, you can't compute lighting, collision detection, or camera orientation.

### Building coordinate frames

Given a forward direction, you can build a full 3D coordinate system:

```python
forward = normalize(camera_direction)        # Where we're looking
up      = np.array([0, 1, 0])               # World up
right   = normalize(np.cross(forward, up))   # Sideways
true_up = np.cross(right, forward)           # Adjusted up

# right, true_up, forward now form an orthonormal basis
# This is what a view matrix is built from
```

This is literally how `glm::lookAt()` and every camera system works.

## Normalization

Many vector operations assume unit-length vectors (magnitude = 1). Normalizing scales a vector to length 1 without changing its direction:

```python
def normalize(v):
    length = np.linalg.norm(v)
    return v / length if length > 0 else v

# Before: magnitude ≈ 5.39
v = np.array([3, 4, 1])
vn = normalize(v)  # ≈ [0.557, 0.743, 0.186], magnitude = 1.0
```

**Always normalize direction vectors** before using them in dot/cross products for lighting or angle calculations. Forgetting this is a common bug — brightness values blow up or shrink unpredictably.

## Quick Reference

| Operation | Input | Output | Used for |
|-----------|-------|--------|----------|
| **Dot product** | Two vectors | Scalar | Angles, lighting, projection |
| **Cross product** | Two 3D vectors | Perpendicular vector | Normals, coordinate frames |
| **Normalize** | One vector | Same direction, length 1 | Preparing directions for dot/cross |

## In the Bigger Picture

- **NeRF** uses dot products to sample along viewing rays
- **Gaussian Splatting** uses dot products to determine viewing angle for opacity blending
- **SAMv2** masks projected to 3D need surface normals to orient correctly
- **Collision detection** uses cross products to test if rays hit triangles

These two operations are the mathematical backbone of 3D graphics. If you understand dot and cross products geometrically, you can reason about most rendering algorithms without memorizing formulas.

---

**Milestone M1 complete.** Next milestone: [Python for ML + C# for Engines](./0006-numpy-to-pytorch-tensors.md)
