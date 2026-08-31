---
title: Inference Pipeline
description: "Loading a saved model, preparing input, running a prediction, and interpreting output — from checkpoint to result."
level: beginner
duration: "6 min"
weight: 14
---

## Training vs Inference

Training adjusts weights. **Inference** uses those frozen weights to make predictions on new data.

In the job, you'll run inference far more often than you train. Most 3D+AI pipelines use pretrained models (SAMv2, GroundingDINO) — you load them, feed data, get results.

## The Five Steps of Inference

```python
# 1. Load the model
# 2. Set eval mode
# 3. Prepare input
# 4. Run forward pass inside no_grad
# 5. Post-process output
```

### 1. Load the Model

```python
import torch
from torchvision.models import resnet18, ResNet18_Weights

# Option A: Load pretrained from TorchVision (downloads weights automatically)
model = resnet18(weights=ResNet18_Weights.DEFAULT)

# Option B: Load your own saved checkpoint
model = resnet18()
model.load_state_dict(torch.load("my_model.pt", weights_only=True))
```

`load_state_dict` loads the weight dictionary into an existing model architecture. `torch.load` reads the file — they work together.

### 2. Set Eval Mode

```python
model.eval()
```

This is not optional. It changes two things:
- **Dropout** is disabled (you want deterministic output, not random zeros)
- **BatchNorm** uses running statistics instead of batch statistics (a single image has meaningless batch stats)

### 3. Prepare Input

The model expects a specific format. Get it wrong and you get garbage — no error, just wrong numbers.

```python
from torchvision.io import read_image
from torchvision.transforms import Resize, Normalize, ConvertImageDtype

transforms = torch.nn.Sequential(
    Resize((224, 224)),
    ConvertImageDtype(torch.float32),
    Normalize(mean=[0.485, 0.456, 0.406],
              std=[0.229, 0.224, 0.225])
)

img = read_image("cat.jpg")       # [3, H, W] uint8
img = transforms(img)             # [3, 224, 224] float32 normalized
img = img.unsqueeze(0)            # [1, 3, 224, 224] — add batch dimension
```

The `unsqueeze(0)` adds a batch dimension. Models always expect a batch, even if it's one image.

### 4. Forward Pass with no_grad

```python
with torch.no_grad():
    output = model(img)
```

`torch.no_grad()` disables gradient computation. Two benefits:
- **Faster** — no gradient tracking means less computation
- **Less memory** — gradients take the same memory as the model itself

Never skip this in inference. Forgetting `no_grad()` on a production pipeline means you're allocating double the GPU memory for no reason.

### 5. Post-process Output

```python
# ResNet outputs raw logits (unnormalized scores)
probabilities = torch.nn.functional.softmax(output[0], dim=0)

# Top 5 predictions
top5 = torch.topk(probabilities, 5)
for prob, idx in zip(top5.values, top5.indices):
    class_name = ResNet18_Weights.DEFAULT.meta["categories"][idx]
    print(f"{class_name}: {prob:.1%}")
```

Raw model output is task-specific:
- **Classification** → logits → softmax → probabilities
- **Detection** → raw boxes + class scores → filter by confidence threshold
- **Segmentation** → logits per pixel → argmax per pixel → mask

## Complete End-to-End Example

```python
import torch
from torchvision.io import read_image
from torchvision.models import resnet18, ResNet18_Weights
from torchvision.transforms import Resize, Normalize, ConvertImageDtype

# Load
model = resnet18(weights=ResNet18_Weights.DEFAULT)
model.eval()

# Preprocess
transforms = torch.nn.Sequential(
    Resize((224, 224)),
    ConvertImageDtype(torch.float32),
    Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
)

img = read_image("cat.jpg")
img = transforms(img).unsqueeze(0)

# Predict
with torch.no_grad():
    output = model(img)

# Post-process
probs = torch.nn.functional.softmax(output[0], dim=0)
top5 = torch.topk(probs, 5)
categories = ResNet18_Weights.DEFAULT.meta["categories"]

for prob, idx in zip(top5.values, top5.indices):
    print(f"{categories[idx]}: {prob:.1%}")
```

Output:
```
tabby: 42.3%
Egyptian_cat: 18.7%
tiger_cat: 12.1%
Persian_cat: 5.4%
lynx: 2.1%
```

## Saving a Model for Later

```python
# Save weights only (recommended)
torch.save(model.state_dict(), "model.pt")

# Load later
model = resnet18()
model.load_state_dict(torch.load("model.pt", weights_only=True))
model.eval()
```

`weights_only=True` is a security best practice — it prevents arbitrary code execution from untrusted checkpoint files.

## Key Takeaways

- Inference = load → eval → preprocess → no_grad forward → postprocess
- `model.eval()` and `torch.no_grad()` are both required — they do different things
- Preprocessing must match what the model was trained on (size, normalization)
- Always add the batch dimension (`unsqueeze(0)`) before feeding a single image

---

**Milestone 3 complete.** Next up: [SAMv2 — Promptable Segmentation](./0015-samv2-promptable-segmentation.md)
