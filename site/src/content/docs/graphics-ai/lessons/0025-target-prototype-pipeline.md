---
title: Target Prototype Pipeline
description: The end-to-end pipeline — photos to point cloud to segmented 3D visualization.
level: advanced
duration: "5 min"
weight: 25
---

## The Pipeline in One Glance

```
Photos → COLMAP (SfM) → Point Cloud → SAMv2 (per-frame masks) → Masked Point Cloud → Open3D Visualization
```

Four stages. Each is a well-understood component with existing tools. You're assembling, not inventing.

## Stage 1: Photos → Point Cloud

**What happens:** Feed a set of overlapping photos into a Structure-from-Motion pipeline. COLMAP estimates camera poses (position + orientation for each photo) and produces a sparse then dense point cloud.

**Why not NeRF/GS here?** They produce radiance fields, not point clouds. For the prototype, a point cloud is simpler to manipulate, segment, and visualize. You can always swap COLMAP for Nerfstudio/Gaussian Splatting later for better visual quality.

**Key output:** `points.ply` — millions of (x, y, z) points with optional RGB.

```python
# COLMAP via subprocess — the easy path
import subprocess
subprocess.run(["colmap", "automatic_reconstructor",
                "--workspace_path", "./workspace",
                "--image_path", "./images"])
```

## Stage 2: SAMv2 Segmentation on Key Frames

**What happens:** Pick one or more representative frames from the photo set. Run SAMv2 with point or box prompts to segment objects of interest. The output is a binary mask per frame.

**Why segment on 2D, not 3D?** SAMv2 operates on images. There's no mature 3D segmentation model with the same zero-shot quality. The bridge: project the 2D mask back into 3D space using the camera poses from Stage 1.

```python
import torch
from sam2 import SAM2ImagePredictor

predictor = SAM2ImagePredictor.from_pretrained("facebook/sam2-hiera-large")
with torch.inference_mode():
    predictor.set_image(frame)
    masks, scores, _ = predictor.predict(
        point_coords=np.array([[x, y]]),  # click prompt
        point_labels=np.array([1]),
    )
```

## Stage 3: Mask → Masked Point Cloud

**What happens:** For each point in the dense cloud, find which camera(s) see it. Check if those pixels fall inside the segmentation mask. If yes, the point belongs to the segmented object.

This is the trickiest part of the prototype — it requires projecting 3D points into 2D image coordinates using the camera intrinsics and extrinsics from COLMAP.

```python
# Simplified projection logic
def project_point(point_3d, K, R, t):
    """Project a 3D world point to 2D pixel coordinates."""
    p_cam = R @ point_3d + t
    pixel = K @ p_cam
    return pixel[:2] / pixel[2]  # u, v

# A point is "in the object" if it projects inside the mask
u, v = project_point(point, K, R, t)
if mask[int(v), int(u)]:
    segmented_points.append(point)
```

## Stage 4: Open3D Visualization

**What happens:** Load the masked point cloud and render it interactively. Open3D gives you rotation, zoom, and panning for free.

```python
import open3d as o3d

pcd = o3d.io.read_point_cloud("segmented_object.ply")
o3d.visualization.draw_geometries([pcd], window_name="Segmented Object")
```

## Component Boundaries

| Component | Input | Output | Tool |
|---|---|---|---|
| SfM Reconstruction | Photos + metadata | Camera poses + dense point cloud | COLMAP |
| 2D Segmentation | Image + prompt | Binary mask | SAMv2 |
| Mask Projection | Point cloud + masks + poses | Filtered point cloud | Custom (numpy) |
| 3D Visualization | Point cloud (.ply) | Interactive render | Open3D |

---

**Next:** [Architecture Decisions](0026-architecture-decisions/)
