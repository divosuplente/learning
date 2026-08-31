---
title: Object Detection vs Segmentation
description: "Bounding boxes, segmentation masks, and the difference between detecting objects and outlining them pixel by pixel."
level: beginner
duration: "6 min"
weight: 12
---

## Two Questions, Two Answers

- **Object detection:** "What objects are in this image and where?" → draws rectangles
- **Segmentation:** "Which pixels belong to each object?" → paints precise outlines

Detection is faster and coarser. Segmentation is slower and more precise. In a 3D pipeline, you often use both: detection to find objects, segmentation to isolate them cleanly.

## Bounding Boxes

A bounding box is a rectangle around a detected object, stored as 4 numbers:

```python
# Format: [x_min, y_min, x_max, y_max]
# or sometimes: [x_center, y_center, width, height] (YOLO format)

box = [120, 80, 340, 290]  # left, top, right, bottom
```

Object detection output: a list of (box, class, confidence):

```python
detections = [
    {"box": [120, 80, 340, 290], "class": "chair", "score": 0.94},
    {"box": [350, 100, 500, 280], "class": "chair", "score": 0.87},
    {"box": [10, 200, 100, 350], "class": "table", "score": 0.72},
]
```

Fast, simple, but rectangles capture background too. Two chairs side by side might overlap in their boxes.

## Segmentation Masks

A segmentation mask is a binary (or multi-class) image the same size as the input, where each pixel is labeled:

```python
import torch

# Mask shape matches image spatial dimensions
mask = torch.zeros(480, 640)        # all pixels = 0 (background)
mask[80:290, 120:340] = some_shape  # chair pixels = 1
# In practice, masks follow the actual object contour, not a rectangle
```

A mask gives you the exact silhouette — no extra background. This matters when you need to extract an object's shape for a 3D pipeline.

## Semantic vs Instance Segmentation

**Semantic segmentation** labels every pixel by class:

```
All chair pixels → class "chair"
All table pixels → class "table"
```

Problem: it can't tell two chairs apart. Every chair pixel gets the same label.

**Instance segmentation** also distinguishes individual objects:

```
Chair 1 pixels → instance 1
Chair 2 pixels → instance 2
Table pixels   → instance 3
```

Instance segmentation = semantic segmentation + object separation. Harder but necessary when you need to know "these are two separate chairs."

```python
# Semantic: one mask per class
semantic_masks = {
    "chair": mask_all_chairs,    # both chairs combined
    "table": mask_table,
}

# Instance: one mask per object
instance_masks = {
    1: mask_chair_left,          # first chair only
    2: mask_chair_right,         # second chair only
    3: mask_table,
}
```

## When to Use Which

| Task | Use | Why |
|------|-----|-----|
| Count objects in a scene | Detection | Fast, boxes are enough for counting |
| Remove background from an object | Segmentation | Need precise pixel boundaries |
| Separate overlapping same-class objects | Instance segmentation | Semantic merges them |
| Feed object shape into 3D reconstruction | Instance segmentation | Need per-object masks |

## Concrete Example: Detection → Segmentation Pipeline

A common pattern: detection finds objects, then segmentation refines each one:

```python
# 1. Detect objects
boxes = detect_objects(image)  # fast, coarse

# 2. For each detected box, segment precisely
masks = []
for box in boxes:
    crop = image[:, box[1]:box[3], box[0]:box[2]]
    mask = segment(crop)       # precise per-pixel mask
    masks.append(mask)

# This is roughly what Mask R-CNN and SAMv2 do internally
```

This is also how SAMv2 works: give it a bounding box prompt, get back a precise mask. GroundingDINO finds the box, SAMv2 refines it.

## Key Takeaways

- Detection → bounding boxes (fast, coarse, "where roughly?")
- Segmentation → pixel masks (precise, "which exact pixels?")
- Semantic = label by class; Instance = label by individual object
- 3D pipelines almost always need segmentation: you can't extract a clean 3D shape from a rectangle

---

**Next:** [Training Loop Anatomy](./0013-training-loop-anatomy.md)
