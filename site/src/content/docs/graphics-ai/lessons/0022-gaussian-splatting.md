---
title: Gaussian Splatting — Explicit Real-Time Rendering
description: "3D Gaussian blobs replace the NeRF network — explicit representation, rasterization-friendly, real-time rendering. Tradeoffs vs NeRF."
level: intermediate
duration: "7 min"
weight: 22
---

## The Shift: Implicit → Explicit

NeRF stores the scene *implicitly* — inside neural network weights you can only query. **Gaussian Splatting** stores the scene *explicitly* — as a list of 3D Gaussian blobs, each with:

- **Position** — center (x, y, z)
- **Covariance** — a 3×3 matrix defining the blob's size, rotation, and stretch (ellipsoid, not sphere)
- **Color** — spherical harmonics coefficients (view-dependent color, same idea as NeRF)
- **Opacity** — how opaque this blob is (0–1)

Instead of querying a network, you *splat* these Gaussians onto the image plane — project each blob from 3D to 2D, sort by depth, and alpha-blend. This is **differentiable rasterization**, not volume rendering.

## Why It's Fast

1. **No network forward passes** — each Gaussian is just data (position + shape + color)
2. **Rasterization, not ray marching** — GPUs are built for this
3. **Tile-based sorting** — the image is divided into tiles; only Gaussians overlapping a tile get processed

Result: **30+ FPS** rendering at 1080p on a consumer GPU, vs seconds per frame for NeRF.

## How Training Works

Same setup as NeRF — photos + COLMAP camera poses. But instead of training a network:

1. Initialize Gaussians from the COLMAP point cloud
2. Render the scene by splatting current Gaussians
3. Compare rendered image to the real photo → compute loss
4. **Backpropagate** through the differentiable rasterizer to update Gaussian parameters (position, covariance, color, opacity)
5. **Adaptive density control** — split large Gaussians, prune transparent ones, clone small ones

Training takes ~15–30 minutes (vs hours for NeRF) because the representation is simpler to optimize.

## NeRF vs Gaussian Splatting

| Aspect | NeRF | Gaussian Splatting |
|--------|------|-------------------|
| Representation | Implicit (network weights) | Explicit (list of Gaussians) |
| Training time | Hours | 15–30 minutes |
| Render speed | Seconds/frame | 30+ FPS |
| Quality | Excellent | Very good (occasional needle-like artifacts) |
| Storage | Small (few MB) | Larger (millions of Gaussians → ~100 MB+) |
| Editability | Very hard | Possible — you can move/delete Gaussians |
| View dependence | Full (via network) | Spherical harmonics (lower order = less accurate) |

## The Artifacts

Gaussian Splatting struggles with:
- **Needle/spike Gaussians** — thin, elongated blobs that look like hair or splinters (especially on edges)
- **Floaters** — small Gaussians floating in empty space
- **Large smooth areas** — thin surfaces (walls, floors) need many Gaussians; NeRF handles these more naturally

## Key Takeaway for Interviews

Gaussian Splatting is the **practical answer** to NeRF's rendering speed problem. It trades some quality and compactness for real-time performance. The explicit representation also makes it * editable* — you can remove or relocate Gaussians, which is impossible with NeRF's implicit network.

The tradeoff: **implicit = elegant + slow, explicit = practical + fast**. In production, speed wins. In research, NeRF variants still produce better quality for some scenes.

---

**Next:** [Mesh Reconstruction — From Points to Triangles](0023-mesh-reconstruction/)
