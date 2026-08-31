---
title: "Coordinate Systems — World, Local, Camera, and Why Engines Disagree"
description: Every 3D point lives in a coordinate system. Understanding which one — and how to convert between them — is the backbone of the render pipeline.
level: beginner
duration: "5 min"
weight: 4
---

## Three Spaces, One Point

A 3D point has different coordinates depending on which frame of reference you're in. The same table corner is at `(0, 0, 0)` in the table's local space, `(3, 1, -2)` in world space, and somewhere else entirely in camera space.

| Space | Origin is… | Used for |
|-------|-----------|----------|
| **Local / Object** | The object's own pivot point | Authoring models in Blender/Maya |
| **World** | The scene's global origin | Placing objects relative to each other |
| **Camera / View** | The camera's position and look direction | Determining what's visible on screen |

## The Transform Chain

A vertex travels through these spaces every frame:

```
Local → World → Camera → Clip → Screen
  M_model  M_view  M_proj    viewport
```

Each arrow is a matrix multiplication. The vertex shader in a GPU does exactly this:

```glsl
// Simplified vertex shader
gl_Position = projection * view * model * vec4(localPos, 1.0);
```

- **Model matrix**: "Where is this object in the world?" (position, rotation, scale)
- **View matrix**: "Where is the camera, and which way does it look?" (inverse of camera's world transform)
- **Projection matrix**: "How does 3D space map to the 2D screen?" (perspective or orthographic)

## Why Engines Disagree

Here's where it gets confusing: not everyone agrees on which axis points where.

| Convention | Up axis | Forward axis | Handedness | Used by |
|-----------|---------|-------------|------------|---------|
| **Y-up, left-handed** | Y | Z | Left | Unity, DirectX |
| **Y-up, right-handed** | Y | -Z | Right | OpenGL, Blender, Open3D |
| **Z-up, right-handed** | Z | -Y | Right | Maya, ROS |

**Handedness** determines which way the cross product points. Make an L with your thumb and index finger:
- **Right-handed**: thumb = X, index = Y, middle = Z (curl fingers from X to Y, thumb points to Z)
- **Left-handed**: same gesture with left hand — Z goes the other way

### In practice

When you load a Blender model into Unity, the Z-axis flips. When you process a point cloud from Open3D in Unity, Y and Z swap. This is not a bug — it's a convention mismatch. Every 3D pipeline handles this somewhere.

```python
# Converting from right-handed Y-up to left-handed Y-up (OpenGL → Unity)
# Flip the Z axis
point_unity = np.array([x, y, -z])
```

## Nested Transforms

Objects in a scene form a tree. A hand is positioned relative to the arm, which is relative to the torso, which is relative to the world:

```
world
 └─ character (translate, rotate)
     └─ arm (rotate shoulder)
         └─ hand (rotate wrist)
```

The hand's **world position** is: `M_world × M_arm × M_hand × local_pos`. Each level multiplies its parent's transform. This is why game engines have a **Transform hierarchy** — each object only stores its local transform, and the world transform is computed by walking up the parent chain.

## Why It Matters for 3D AI

- NeRF trains in **camera space** but renders in **world space** — you need to know which frame a dataset uses
- Point clouds from depth sensors arrive in **camera space** — they need a transform to land in world space
- SAMv2 outputs 2D masks — projecting them to 3D requires knowing the camera's view and projection matrices
- Gaussian Splatting stores splat positions in **world space** but the renderer transforms them to camera space each frame

Get the coordinate system wrong and objects appear mirrored, floating, or inside-out. It's the #1 source of bugs when bridging AI outputs into game engines.

---

**Next:** [Dot & Cross Products](0005-dot-and-cross-products/)
