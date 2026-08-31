---
title: Architecture Decisions
description: "Why Python/PyTorch for the CV pipeline, C# for visualization, and how they communicate."
level: advanced
duration: "6 min"
weight: 26
---

## The Split: Python Handles AI, C# Handles Rendering

Real production systems at this intersection almost always split into two processes:

- **Python side:** Data loading, model inference, 3D reconstruction — the "science" stack
- **C# side:** Scene management, real-time rendering, user interaction — the "engine" stack

Why? Each ecosystem is best at its own domain. PyTorch has no game engine. Unity has no SAMv2. The architecture question is *how they talk*.

## Why Python + PyTorch for the CV Pipeline

- **Every vision model publishes PyTorch weights.** SAMv2, GroundingDINO, FlorenceV2 — all PyTorch. No porting needed.
- **PyTorch's tensor operations map directly to GPU.** `model.cuda()` → inference on GPU. No manual CUDA kernels.
- **The PyTorch ecosystem is massive.** TorchVision, HuggingFace Transformers, Open3D's Python bindings — they all interoperate.
- **Rapid prototyping.** A Jupyter notebook + pretrained model → working pipeline in hours, not weeks.

**Tradeoff:** Python is slower than C++ for the glue code between models. For a prototype this doesn't matter. For production, you'd profile and move bottlenecks to C++ extensions or ONNX Runtime.

## Why C# for Visualization

- **C# is the language of Unity, Evergine, and other .NET-based engines.** Same syntax, same patterns — MonoBehaviour/Drawable, `Update()` maps to frame callbacks.
- **Real-time rendering needs frame-level control.** Game engines give you camera systems, asset loading, materials, and shaders out of the box. Writing this from scratch in Python would take months.
- **User interaction.** Click to place a segmentation prompt? That's a raycast from camera through mouse position — one line in a game engine, a custom implementation in raw OpenGL.

## How They Communicate

This is the architecture question that matters most. Three patterns, in order of complexity:

### 1. File-Based (Simplest — Prototype Ready)

```
Python writes segmented_object.ply → Engine loads .ply on refresh
```

- Python runs the pipeline, writes `.ply` or `.obj` files.
- The engine watches a directory or polls for changes.
- Good enough for a demo. Bad for interactivity — you can't send a click prompt from the engine back to Python.

```python
# Python side — write result
o3d.io.write_point_cloud("output/segmented.ply", pcd)

# C# side — load result (Unity example)
var meshFilter = GetComponent<MeshFilter>();
meshFilter.mesh = ObjImporter.ImportFile("output/segmented.obj");
```

### 2. REST API (Bidirectional, Still Simple)

```
Engine → HTTP POST /segment {"point": [x, y]} → Python Flask server → mask → .ply response
```

- Python runs a lightweight Flask/FastAPI server with endpoints: `/segment`, `/reconstruct`, `/status`.
- The engine sends prompts and receives results.
- Latency: tens of milliseconds for the HTTP overhead. Fine for interactive use, not for per-frame.

```python
# Python side
from fastapi import FastAPI
app = FastAPI()

@app.post("/segment")
async def segment(prompt: SegmentPrompt):
    masks = run_samv2(prompt.image, prompt.point)
    save_masked_cloud(masks)
    return {"status": "ok", "file": "output/segmented.ply"}
```

### 3. Shared Memory / gRPC (Production Grade)

- Zero-copy data sharing for large point clouds (millions of points).
- gRPC for structured bidirectional streaming.
- Overkill for a prototype, but good to know it exists.

**The practical answer:**

> "For the prototype, file-based communication — it's simple and decoupled. For production, a REST API for control messages and shared memory or memory-mapped files for large 3D data. The bottleneck isn't the communication pattern, it's the inference speed."

## Decision Summary

| Decision | Choice | Why | When to Revisit |
|---|---|---|---|
| Language for AI pipeline | Python + PyTorch | Ecosystem, speed of prototyping | If inference latency becomes critical → ONNX Runtime in C# |
| Language for rendering | C# + game engine | Real-time rendering, interactivity | If the project doesn't need interactivity → Python + Open3D only |
| Communication | File-based → REST | Simplest path that works | If you need sub-100ms round trips → gRPC + shared memory |
| 3D format for exchange | PLY / OBJ | Universally supported | If you need materials or animations → glTF |

---

**Next:** [Deploying 3D AI](0027-deploying-3d-ai/)
