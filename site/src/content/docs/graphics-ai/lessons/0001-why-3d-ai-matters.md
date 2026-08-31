---
title: Why 3D + AI Matters
description: What this role is about and why the intersection of graphics and AI is where the industry is heading.
level: intro
duration: "5 min"
weight: 1
---

## The Job in One Sentence

Plain Concepts wants someone who can take AI models that understand images and turn that understanding into interactive 3D applications.

## Why This Intersection?

Traditional 3D content is hand-crafted: artists model, texture, and animate every object. It's slow and expensive.

AI changes that. Models can now:
- **Reconstruct 3D scenes from photos** (NeRF, Gaussian Splatting)
- **Segment objects in images** (SAMv2) → isolate assets for 3D pipelines
- **Detect and label objects by description** (GroundingDINO) → "find all chairs in this scan"
- **Generate textures, textures maps, even geometry** from text prompts

The engineering challenge is bridging these AI outputs into game engines and real-time renderers where users interact with the result.

## What You'll Build Toward

A small prototype that demonstrates the full loop:
1. Take a set of photos of a scene
2. Generate a 3D representation (point cloud or Gaussian Splatting)
3. Segment or detect objects within it
4. Visualize the result interactively

You don't need to build this from scratch for the interview. You need to understand each step well enough to explain it and discuss tradeoffs.

## First Step

Start with **math intuition**, not code. If vectors, matrices, and coordinate transforms feel foreign, PyTorch and NeRF will be impenetrable. Phase 1 begins with 3Blue1Brown's Essence of Linear Algebra — you don't need to watch every video, just enough to understand what a matrix multiplication *does* to a 3D point.

---

**Next:** [Vectors and Transformations](0002-vectors-and-transformations/)
