---
title: Point Clouds
description: "The raw output of 3D sensing — what point clouds are, how to load and visualize them with Open3D, and basic operations like filtering and downsampling."
level: intermediate
duration: "5 min"
weight: 20
---

## What Is a Point Cloud?

A point cloud is a set of 3D coordinates sampled from the surface of an object or scene. Each point has at minimum an **(x, y, z)** position. Most point clouds also carry:

- **Color** — (r, g, b) per point (from a color camera aligned to a depth sensor)
- **Normal** — (nx, ny, nz) — the direction the surface faces at that point (estimated, not measured)

Think of it as a sparse, unconnected 3D photograph. No triangles, no edges — just dots floating in space.

**Where they come from:** LiDAR scanners, depth cameras (Intel RealSense, Azure Kinect), structure-from-motion pipelines (COLMAP), and NeRF/Gaussian Splatting outputs.

## Loading and Visualizing with Open3D

Open3D is the go-to Python library for point cloud processing. Install: `pip install open3d`.

```python
import open3d as o3d
import numpy as np

# Load a point cloud from a .ply file
pcd = o3d.io.read_point_cloud("bunny.ply")
print(pcd)  # shows point count, has_normals, has_colors

# Visualize it
o3d.visualization.draw_geometries([pcd], window_name="Point Cloud")
```

You can also create one from raw NumPy data:

```python
# 1000 random points in a unit sphere
pts = np.random.randn(1000, 3)
pts = pts / np.linalg.norm(pts, axis=1, keepdims=True) * np.random.rand(1000, 1)

pcd = o3d.geometry.PointCloud()
pcd.points = o3d.utility.Vector3dVector(pts)
pcd.paint_uniform_color([0.5, 0.5, 0.5])  # gray
o3d.visualization.draw_geometries([pcd])
```

## Basic Operations

### Statistical Outlier Removal

Raw scans have noise — isolated points far from the surface. Remove them:

```python
pcd_clean, idx = pcd.remove_statistical_outlier(
    nb_neighbors=20,    # how many neighbors to check
    std_ratio=2.0       # how far from the mean distance is "too far"
)
# pcd_clean has outliers removed; idx is the mask of kept points
```

### Voxel Downsampling

Point clouds from sensors are often densely oversampled in some areas. Voxel downsampling collapses all points within a 3D grid cell (voxel) into one:

```python
pcd_down = pcd.voxel_down_sample(voxel_size=0.05)  # 5cm voxels
```

This reduces point count while preserving overall shape — essential before feeding data into reconstruction algorithms.

### Normal Estimation

Normals are needed for mesh reconstruction and surface shading. They're estimated from the local neighborhood geometry:

```python
pcd.estimate_normals(
    search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30)
)
```

Open3D uses the covariance of nearby points to determine the surface orientation. The `radius` controls the neighborhood size — too small = noisy normals, too large = smoothed-out details.

## Key Takeaway

A point cloud is the **raw bridge** between 3D sensing and 3D processing. You load it, clean it, downsample it, and estimate normals — then feed it into reconstruction (Lesson 0023) or visualize it directly.

---

**Next:** [NeRF — Neural Radiance Fields](0021-nerf/)
