---
title: SAMv2 — Promptable Segmentation
description: "Meta's Segment Anything Model 2 — give it a point or box prompt, get a pixel-perfect mask. Zero-shot on objects it never saw."
level: intermediate
duration: "5 min"
weight: 15
---

## The Contract

| Input | Output |
|-------|--------|
| Image + point/box prompt | Binary segmentation mask |

SAMv2 doesn't *classify* anything. It segments whatever you point at. That's the key insight: the model separates its job into "find the object boundary" and "which object is this." It only does the first part — you decide *what* to point at.

## Prompt Types

- **Point prompt**: a single (x, y) coordinate on the image. The model returns the mask of the object under that point. Think of it as clicking on something.
- **Box prompt**: a bounding box [x1, y1, x2, y2]. The model segments whatever is inside. Useful when you already have a rough detection from another model.
- **Multiple points**: refine the mask — positive points for "include this area," negative points for "exclude this area."

## Zero-Shot Capability

SAMv2 works on objects it never saw during training. Point at a weird sculptural object, a half-occluded chair, or a blurry background element — it still produces a mask. That's what "segment anything" means.

How? The training data covers 11 million images and 1.1 billion masks. The model learned what *object boundaries* look like in general, not what specific objects look like.

> **Analogy:** SAMv2 is like someone who can trace around any object with a pen, even if they don't know the object's name. You point; it traces.

## Running Inference

### HuggingFace (zero install)

Go to the [SAMv2 demo space](https://huggingface.co/spaces/facebook/sam2) — upload an image, click a point, get a mask. Fastest way to see it work.

### Local (HuggingFace)

```python
import torch
from sam2 import SAM2ImagePredictor

# Load model via HuggingFace (recommended — auto-downloads weights)
predictor = SAM2ImagePredictor.from_pretrained("facebook/sam2-hiera-large")

with torch.inference_mode():
    predictor.set_image(image)  # RGB numpy array
    masks, scores, logits = predictor.predict(
        point_coords=np.array([[x, y]]),  # your click
        point_labels=np.array([1]),        # 1 = foreground
    )

# masks: (num_candidates, H, W) — boolean arrays
# scores: confidence per mask
# Pick the highest-scoring mask:
best_mask = masks[scores.argmax()]
```

## What the Output Looks Like

- `masks`: boolean array, shape `(3, H, W)` — three candidate masks of decreasing quality
- `scores`: float array, shape `(3,)` — confidence for each candidate
- `logits`: low-res logits, shape `(3, 256, 256)` — used for refining with more prompts

Always pick the highest-scoring mask unless you have a reason not to.

## When to Pick SAMv2

- You need pixel-perfect object boundaries (not just bounding boxes)
- You know *where* the object is (from a click, another detector, or a script)
- You don't care about class labels — just the mask
- You're working in a pipeline: another model detects, SAMv2 segments

## When NOT to Pick SAMv2

- You need to know *what* the object is (use a classifier or GroundingDINO instead)
- You don't have any prompts — SAMv2 can auto-generate masks for everything in the image (`generate` mode), but it's slower and you still don't get labels

---

**Next:** [GroundingDINO — Text-Guided Detection](0016-grounding-dino-text-detection/)
