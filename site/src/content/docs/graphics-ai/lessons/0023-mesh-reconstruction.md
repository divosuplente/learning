---
title: Mesh Reconstruction — From Points to Triangles
description: "Converting point clouds into watertight meshes using Poisson reconstruction and Marching Cubes — because game engines need triangles, not dots."
level: intermediate
duration: "6 min"
weight: 23
---

## Why Meshes?

Point clouds and Gaussian Splatting are great for rendering, but game engines (Unity, Unreal, Evergine) and most 3D pipelines expect **meshes** — vertices connected by edges and triangular faces. Meshes are the universal exchange format of 3D.

The gap: you have a point cloud → you need a mesh. Two algorithms bridge this gap.

## Poisson Reconstruction

**Idea:** Fit a smooth *indicator function* (1 = inside, 0 = outside) through the point cloud, then extract the surface where the function = 0.5.

**Input:** Oriented point cloud (points + estimated normals)
**Output:** Watertight triangle mesh

```python
import open3d as o3d

pcd = o3d.io.read_point_cloud("scan.ply")
pcd.estimate_normals(
    search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30)
)

# Orient normals consistently (all pointing outward)
pcd.orient_normals_consistent_tangent_plane(k=15)

# Poisson reconstruction
mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
    pcd, depth=9  # octree depth — higher = more detail, slower
)

# Cropping: Poisson always creates a watertight mesh, often extending
# beyond the actual scan. Crop to a bounding box:
bbox = pcd.get_axis_aligned_bounding_box()
mesh = mesh.crop(bbox)

o3d.visualization.draw_geometries([mesh], mesh_show_back_face=True)
```

**Strengths:**
- Always produces a watertight mesh (no holes)
- Smooth surfaces — good for organic shapes (statues, people, terrain)
- Robust to noisy input

**Weaknesses:**
- Smooths out sharp edges (could be a feature or a bug depending on your scene)
- The "watertight" guarantee means it fills holes that should be open (doorways, windows)
- Requires oriented normals — bad normals = bad mesh

## Marching Cubes

**Idea:** Divide space into a regular voxel grid. For each voxel, sample the signed distance to the surface at the 8 corners. There are 256 possible configurations of inside/outside corners — each maps to a precomputed set of triangles. Stitch them all together.

**Input:** An implicit function (a signed distance field or density field)
**Output:** Triangle mesh (not guaranteed watertight, but usually close)

```python
import numpy as np
from skimage import measure

# Example: extract mesh from a 3D scalar field (e.g., a NeRF's density grid)
# volume is a 3D numpy array where >0 = inside the surface
verts, faces, normals, values = measure.marching_cubes(
    volume, level=0.0  # iso-surface value
)

# Convert to Open3D mesh
mesh = o3d.geometry.TriangleMesh(
    vertices=o3d.utility.Vector3dVector(verts),
    triangles=o3d.utility.Vector3iVector(faces)
)
mesh.compute_vertex_normals()
```

**Strengths:**
- Works on any implicit field — NeRF density grids, SDFs, voxel grids
- Exact control over mesh resolution via grid size
- Fast and deterministic

**Weaknesses:**
- Resolution limited by voxel grid (too coarse = blocky mesh)
- Not inherently watertight (though usually close)
- Needs a complete implicit field — doesn't work on sparse point clouds directly

## When to Use Which

| Situation | Use |
|-----------|-----|
| Point cloud with normals → mesh | Poisson |
| NeRF density → mesh | Marching Cubes |
| Need watertight guarantee | Poisson |
| Need exact surface at iso-value | Marching Cubes |
| Sharp features important | Marching Cubes (higher resolution) |
| Noisy scan, need smooth result | Poisson |

## Key Takeaway

Mesh reconstruction is the **last mile** from 3D data to a usable 3D asset. In practice, both algorithms produce meshes that need cleanup in Blender or similar tools — removing spurious faces, filling remaining holes, simplifying where too dense. The algorithms give you *a* mesh, not always *the right* mesh.

---

**Next:** [Nerfstudio — Running NeRF/Gaussian Splatting via CLI](./0024-nerfstudio.md)
