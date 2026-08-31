---
title: Images as Tensors
description: "How images become numbers — channels, tensor shapes, normalization, and loading with PyTorch."
level: beginner
duration: "5 min"
weight: 10
---

## From Photo to Numbers

A digital image is a grid of pixels. Each pixel has color values — red, green, blue — stored as integers 0–255.

To feed an image into a neural network, you convert it to a **tensor**: a multi-dimensional array of floating-point numbers.

## Channels (RGB)

An RGB image has 3 color channels stacked together:

```
Image shape: 480 × 640 × 3
             height  width  channels
```

- **R channel** — red intensity at each pixel
- **G channel** — green intensity at each pixel
- **B channel** — blue intensity at each pixel

A grayscale image has 1 channel. Some formats add alpha (transparency) → 4 channels (RGBA).

## Shape Convention: H×W×C vs C×H×W

Libraries disagree on dimension order — this trips everyone up at least once:

| Library | Shape | Means |
|---------|-------|-------|
| NumPy, PIL, OpenCV | `(H, W, C)` | Height × Width × Channels |
| PyTorch | `(C, H, W)` | Channels × Height × Width |

PyTorch puts channels **first**. Why? GPU kernels and convolution layers expect contiguous channel slices. It's the same data, just rearranged.

```python
import torch
from torchvision.io import read_image

# This returns a tensor in C×H×W format automatically
img = read_image("photo.jpg")
print(img.shape)  # torch.Size([3, 480, 640])
```

## Normalization

Raw pixel values are integers 0–255. Neural networks want small, centered floats. Two common schemes:

**Scale to [0, 1]:**
```python
img_float = img / 255.0
```

**Mean/std normalization** (used by pretrained models like ResNet):
```python
from torchvision.transforms import Normalize

normalize = Normalize(
    mean=[0.485, 0.456, 0.406],  # ImageNet averages
    std=[0.229, 0.224, 0.225]    # ImageNet stds
)
img_normalized = normalize(img_float)
```

Why? The ImageNet-pretrained weights expect input distributed this way. Feed it raw 0–255 values and accuracy tanks.

**Mnemonic:** Think of it like Celsius vs Kelvin — same temperature, different scale. The network expects Kelvin.

## Loading an Image End-to-End

```python
import torch
from torchvision.io import read_image
from torchvision.transforms import Resize, Normalize, ConvertImageDtype

# Pipeline: load → resize → float → normalize
transforms = torch.nn.Sequential(
    Resize((224, 224)),           # most models expect 224×224
    ConvertImageDtype(torch.float32),  # uint8 → float32, scales to [0,1]
    Normalize(mean=[0.485, 0.456, 0.406],
              std=[0.229, 0.224, 0.225])
)

img = read_image("photo.jpg")    # [3, H, W], uint8
img = transforms(img)            # [3, 224, 224], float32, normalized
print(img.shape, img.dtype)      # torch.Size([3, 224, 224]) torch.float32
```

## Key Takeaways

- Images are `(C, H, W)` tensors in PyTorch — channels first
- Normalize before feeding to a model (scale + mean/std)
- Pretrained models have specific input expectations — respect them or get garbage out

---

**Next:** [Convolutions from Theory to Code](0011-convolutions-from-theory-to-code/)
