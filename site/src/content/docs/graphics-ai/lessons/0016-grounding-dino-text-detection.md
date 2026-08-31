---
title: GroundingDINO — Text-Guided Object Detection
description: "Describe what you want in plain English and get bounding boxes. Open-set detection that doesn't need a fixed class list."
level: intermediate
duration: "5 min"
weight: 16
---

## The Contract

| Input | Output |
|-------|--------|
| Image + text prompt | Bounding boxes with confidence scores |

GroundingDINO detects objects you describe in natural language. "Red car," "the person on the left," "a cup on the table" — it finds them and draws boxes around them. No predefined class list. No retraining.

## Why "Open-Set" Matters

Traditional detectors (YOLO, Faster R-CNN) only detect classes they were trained on. Trained on COCO's 80 classes? You'll never detect a "stapler" — it's not in the vocabulary.

GroundingDINO is **open-set**: the text prompt defines the classes at inference time. You can ask for anything describable in language. This is a game-changer for production pipelines where the set of relevant objects isn't known in advance.

## How It Works (Conceptually)

GroundingDINO fuses two modalities — language and vision — at multiple stages:

1. **Text encoder** (BERT-like) turns your prompt "red car" into embeddings
2. **Image backbone** (Swin Transformer) extracts visual features from the image
3. **Feature fusion** layers combine text and vision at multiple resolutions — this is the key innovation. Early fusion means the model can attend to "red" while looking at visual features, not after
4. **Detection head** predicts bounding boxes and alignment scores

The fusion is what makes it "grounded" — the text is *grounded* in the visual features, not processed separately.

> **Analogy:** A traditional detector is like a checklist — it can only tick boxes that exist on the page. GroundingDINO is like describing something to a friend and having them point at it. The description *creates* the category on the fly.

## Running Inference

### HuggingFace

Use the [GroundingDINO space](https://huggingface.co/spaces/ShilongLiu/Grounding_DINO_demo) for quick experimentation.

### Local (PyTorch)

```python
from groundingdino.util.inference import load_model, predict
from groundingdino.util.utils import get_phrases_from_posmap

model = load_model("groundingdino_swinb_cogcoor.pth", "GroundingDINO_SwinB.cfg.py")

boxes, logits, phrases = predict(
    model=model,
    image=image,              # RGB numpy array
    caption="a red car",     # your text prompt
    box_threshold=0.35,       # lower = more detections, more false positives
    text_threshold=0.25,      # lower = looser text-to-box matching
)

# boxes: (N, 4) — [x_center, y_center, width, height] normalized to [0,1]
# logits: (N,) — confidence scores
# phrases: list of matched text phrases
```

## Prompt Tips

- Be specific: "red car" > "car" > "vehicle"
- You can list multiple targets separated by periods: "a dog. a frisbee"
- The model works best with noun phrases (not full sentences): "wooden chair" not "find me the chair that is wooden"
- `box_threshold` is your main quality knob — tune it for your use case

## The SAMv2 + GroundingDINO Pipeline

This is the common production pattern:

```
Text prompt → GroundingDINO (find the box) → SAMv2 (segment the object)
```

GroundingDINO gives you a bounding box. Feed that box as a prompt to SAMv2, and you get a pixel-perfect mask. Together they give you: *find by description, segment to pixel precision.*

```python
# Get box from GroundingDINO
boxes, logits, phrases = predict(model, image, caption="red car", ...)

# Convert box to SAMv2 format and segment
h, w = image.shape[:2]
box_xyxy = box_to_xyxy(boxes[0], w, h)  # convert normalized → pixel coords
masks, scores, _ = sam_predictor.predict(box=box_xyxy)
```

## When to Pick GroundingDINO

- You need to *find* objects by description, not by clicking
- The set of target objects is unknown or changes per request
- You're building the first stage of a detect-then-segment pipeline

## When NOT to Pick GroundingDINO

- You need pixel-level masks (pair it with SAMv2 instead)
- You have a fixed, small set of classes and need maximum speed (YOLO is faster for closed-set detection)
- You need 3D bounding boxes (this is 2D only)

---

**Next:** [FlorenceV2 — Unified Vision Model](0017-florence-v2-unified-vision/)
