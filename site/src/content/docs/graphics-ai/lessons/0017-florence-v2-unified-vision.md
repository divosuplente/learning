---
title: FlorenceV2 — Unified Vision Model
description: "One model, many tasks — captioning, detection, segmentation. Why multi-task design matters for production."
level: intermediate
duration: "5 min"
weight: 17
---

## The Contract

| Input | Output (depends on task) |
|-------|--------------------------|
| Image + task prompt | Caption, bounding boxes, segmentation masks, OCR text, etc. |

FlorenceV2 is a **unified** vision model: one set of weights handles multiple tasks, selected by the task prompt you send. Instead of deploying five separate models for five tasks, you deploy one.

## Supported Tasks

| Task prompt | What it does | Output |
|-------------|-------------|--------|
| `<CAPTION>` | Describe the image in one sentence | Text string |
| `<DETAILED_CAPTION>` | Longer description | Text string |
| `<OD>` | Object detection | Bounding boxes + labels |
| `<DENSE_REGION_CAPTION>` | Caption each region | Boxes + per-region captions |
| `<REFERRING_EXPRESSION_SEGMENTATION>` | Segment from text description | Masks |
| `<OCR>` | Read text in the image | Text + bounding boxes |

This is not a wrapper around separate models. FlorenceV2 is trained on a **unified task space** — the same encoder-decoder processes all tasks. The task prompt tells the decoder what format to produce.

## Why Multi-Task Matters for Production

**One model = one deployment.** In a real pipeline:

| Separate models | FlorenceV2 |
|----------------|------------|
| Deploy classifier + detector + segmenter | Deploy one model |
| 3× GPU memory, 3× cold starts | 1× GPU memory, 1× cold start |
| Different input preprocessing per model | Same preprocessing for all tasks |
| Version skew (model A updated, B not) | Single version for everything |

For a prototype or interview demo, this matters less. For production at scale, it matters a lot — every model you deploy is a maintenance burden.

**Quality tradeoff:** A specialist model (SAMv2 for segmentation, GroundingDINO for detection) will typically outperform FlorenceV2 on its specific task. FlorenceV2's advantage is *good enough across multiple tasks with one deployment* — not *best in class for each task*.

> **Analogy:** FlorenceV2 is like a Swiss army knife — decent at many things, not the best at any single one. SAMv2 is a scalpel — perfect for one job. Pick the scalpel when you need precision; pick the Swiss army knife when you need versatility and simplicity.

## Running Inference

### HuggingFace

Try the [Florence-2 demo](https://huggingface.co/spaces/microsoft/Florence-2) — upload an image, pick a task, see results.

### Local (Transformers)

```python
from transformers import AutoProcessor, AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "microsoft/Florence-2-large", trust_remote_code=True
)
processor = AutoProcessor.from_pretrained(
    "microsoft/Florence-2-large", trust_remote_code=True
)

# Object detection
inputs = processor(text="<OD>", images=image, return_tensors="pt")
generated_ids = model.generate(**inputs, max_new_tokens=1024)
results = processor.post_process_generation(
    generated_ids[0], task="<OD>", image_size=(w, h)
)

# results["<OD>"] = {"bboxes": [...], "labels": [...]}
```

## The Three Models Compared

| | SAMv2 | GroundingDINO | FlorenceV2 |
|---|---|---|---|
| **Input** | Image + point/box | Image + text | Image + task prompt |
| **Output** | Segmentation mask | Bounding boxes | Depends on task |
| **Strength** | Pixel-perfect masks | Open-set text detection | Multiple tasks, one model |
| **Weakness** | No labels, needs prompt | No masks, 2D only | Not best-in-class per task |
| **Pick when** | You need precise boundaries | You need to find by description | You need multiple tasks with one deploy |

This is the comparison table to know cold for interviews.

## When to Pick FlorenceV2

- You need multiple vision tasks and want one deployment
- Your pipeline does captioning *and* detection *and* segmentation (not just one)
- You're prototyping and want to experiment with tasks quickly

## When NOT to Pick FlorenceV2

- You need the best possible segmentation quality (SAMv2 is better)
- You need best possible text-guided detection (GroundingDINO is better)
- You only need one task — a specialist model will serve you better

---

**Next:** [Vision Transformers — How Transformers Replaced CNNs](./0018-vision-transformers.md)
