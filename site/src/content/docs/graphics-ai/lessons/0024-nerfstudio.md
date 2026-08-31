---
title: Nerfstudio — Running NeRF and Gaussian Splatting via CLI
description: How to go from a folder of photos to a trained NeRF or Gaussian Splatting model using Nerfstudio — no from-scratch implementation needed.
level: intermediate
duration: "7 min"
weight: 24
---

## Why Nerfstudio?

Implementing NeRF or Gaussian Splatting from scratch is a research project, not an engineering task. **Nerfstudio** gives you:

- A CLI to train and render multiple NeRF/Gaussian Splatting models
- Standard dataset format — feed it images, it handles the rest
- Built-in COLMAP integration for camera pose estimation
- A web viewer to inspect results in real time during training
- Swap models with one argument (`nerfacto` vs `splatfacto` vs others)

For interview fluency: knowing *how to use* these tools is more valuable than re-implementing them.

## Installation

```bash
# Create a conda environment
conda create -n nerfstudio python=3.10 -y
conda activate nerfstudio

# Install Nerfstudio (includes PyTorch, COLMAP bindings, etc.)
pip install nerfstudio
```

Requires an NVIDIA GPU with CUDA. No GPU = no training (rendering works on CPU but slowly).

## Dataset Format

Nerfstudio expects a folder of images plus a `transforms.json` file describing camera poses. The simplest path:

```bash
# Process a folder of images — runs COLMAP automatically
ns-process-data images \
    --data /path/to/photos \
    --output-dir /path/to/processed_dataset
```

This creates:
- `images/` — resized images
- `transforms.json` — camera poses from COLMAP (intrinsics + extrinsics per image)
- `colmap/` — raw COLMAP output (sparse reconstruction)

**Photo tips for better results:**
- 50–200 images of the scene from varied angles
- Overlap between adjacent photos (~60–80%)
- Consistent lighting (avoid strong shadows or changing light)
- No blurry shots — blur confuses COLMAP

## Training

```bash
# Train a NeRF model (nerfacto — Nerfstudio's default NeRF variant)
ns train nerfacto \
    --data /path/to/processed_dataset \
    --output-dir /path/to/output

# Train Gaussian Splatting instead (splatfacto)
ns train splatfacto \
    --data /path/to/processed_dataset \
    --output-dir /path/to/output
```

Training opens a web viewer at `http://localhost:7007` where you can watch the reconstruction improve in real time. The viewer lets you orbit the scene, compare with input images, and inspect quality.

**Typical training times** (RTX 3090):
- `nerfacto`: 30 min – 2 hours
- `splatfacto`: 15–30 minutes

## Rendering

After training, export images or a video from novel viewpoints:

```bash
# Render a spiral camera path video
ns render \
    --load-config /path/to/output/nerfacto/config.yml \
    --camera-path-filename spiral.json \
    --output-path render.mp4
```

You can also generate the camera path interactively in the web viewer, then export it for rendering.

## Exporting a Point Cloud or Mesh

```bash
# Export point cloud from a trained NeRF
ns-export pointcloud \
    --load-config /path/to/output/nerfacto/config.yml \
    --output-dir /path/to/export \
    --num-points 1000000

# Export mesh (uses Marching Cubes internally)
ns-export mesh \
    --load-config /path/to/output/nerfacto/config.yml \
    --output-dir /path/to/export \
    --resolution 512
```

The exported point cloud can be loaded in Open3D (Lesson 0020). The mesh can go to Blender, Unity, or any engine that reads `.ply` or `.obj`.

## The Full Pipeline in Practice

```
Photos ──► ns-process-data ──► Dataset + Camera Poses
                                      │
                                      ▼
                              ns train splatfacto
                                      │
                          ┌───────────┼───────────┐
                          ▼           ▼           ▼
                     Web viewer   ns render   ns-export
                    (inspect)    (video)    (mesh/ply)
```

You don't write the NeRF math. You don't implement the Gaussian Splatting rasterizer. You give it data, pick a model, and iterate on the *quality of your input* — better photos, better coverage, consistent lighting.

## Key Takeaway

Nerfstudio is the **practical on-ramp** to 3D reconstruction. For the interview, being able to say "I used Nerfstudio's splatfacto model to reconstruct a scene from 80 photos, trained in 20 minutes, and exported a mesh for use in Unity" is far more impressive than "I read the NeRF paper." The engineering value is in the pipeline, not the algorithm.

---

**Next:** [Target Prototype — Photos to Point Cloud to Segmentation](0025-target-prototype-pipeline/)
