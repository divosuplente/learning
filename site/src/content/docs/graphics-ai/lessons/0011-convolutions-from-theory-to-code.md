---
title: Convolutions from Theory to Code
description: "How kernels slide over images to detect features, and how to use nn.Conv2d in PyTorch."
level: beginner
duration: "7 min"
weight: 11
---

## The Core Idea

A **convolution** slides a small matrix (kernel or filter) across an image. At each position, it multiplies overlapping values element-wise and sums them into one output pixel. The result: a **feature map** highlighting a pattern the kernel detects.

Think of it like shining a flashlight over a photo — the flashlight sees only a small patch at a time, and you record what it finds at each position.

## Kernel Sliding Step-by-Step

Given a 5×5 image and a 3×3 kernel:

```
Image:                    Kernel (edge detector):
┌─┬─┬─┬─┬─┐             ┌──┬──┬──┐
│1│0│1│0│1│             │-1│-1│-1│
├─┼─┼─┼─┼─┤             ├──┼──┼──┤
│0│1│0│1│0│             │ 0│ 0│ 0│
├─┼─┼─┼─┼─┤             ├──┼──┼──┤
│1│0│1│0│1│             │ 1│ 1│ 1│
├─┼─┼─┼─┼─┤             └──┴──┴──┘
│0│1│0│1│0│
├─┼─┼─┼─┼─┤
│1│0│1│0│1│
└─┴─┴─┴─┴─┘
```

Place the kernel at the top-left, multiply element-wise, sum → that's the first output pixel. Slide right by **stride** pixels, repeat. When you reach the end, move down by stride and start again.

With stride 1, a 5×5 image + 3×3 kernel → 3×3 output (you lose 2 pixels on each axis).

## Stride and Padding

**Stride** — how many pixels the kernel moves per step. Stride 2 halves the spatial dimensions.

**Padding** — add zeros around the image border so the output stays the same size. With a 3×3 kernel and padding 1:

```
Input: 5×5  →  Pad to 7×7  →  Kernel 3×3, stride 1  →  Output: 5×5
```

Output size formula:
```
output = floor((input + 2×padding - kernel) / stride) + 1
```

| Config | Input | Output |
|--------|-------|--------|
| stride=1, padding=0 | 32×32 | 30×30 |
| stride=1, padding=1 | 32×32 | 32×32 |
| stride=2, padding=1 | 32×32 | 16×16 |

## Multiple Kernels → Multiple Feature Maps

One kernel detects one pattern. A convolution layer uses **many kernels** (called `out_channels`), each producing its own feature map. Stack them along the channel dimension:

```
Input:  [3, 32, 32]        (3 channels, 32×32 image)
Kernel: 16 kernels of [3, 3, 3]  (16 output channels, 3×3 spatial, 3 input channels)
Output: [16, 30, 30]       (16 feature maps, 30×30 spatial)
```

Each kernel looks at **all input channels** simultaneously and produces a single output channel.

## nn.Conv2d in PyTorch

```python
import torch
import torch.nn as nn

# Conv2d(in_channels, out_channels, kernel_size, stride, padding)
conv = nn.Conv2d(3, 16, kernel_size=3, stride=1, padding=1)

img = torch.randn(1, 3, 224, 224)  # batch=1, channels=3, H=224, W=224
out = conv(img)
print(out.shape)  # torch.Size([1, 16, 224, 224])
```

Breakdown:
- `in_channels=3` — expects RGB input
- `out_channels=16` — produces 16 feature maps
- `kernel_size=3` — 3×3 kernel (common default)
- `padding=1` — same padding: output spatial size = input spatial size

The kernel weights are **learned** during training — the network figures out which patterns to detect (edges, textures, shapes) from the data.

## A Minimal Convolutional Block

```python
class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),   # stabilize training
            nn.ReLU()                  # nonlinear activation
        )

    def forward(self, x):
        return self.block(x)

block = ConvBlock(3, 16)
out = block(torch.randn(1, 3, 64, 64))
print(out.shape)  # torch.Size([1, 16, 64, 64])
```

Conv → BatchNorm → ReLU is the standard recipe. You'll see it repeated throughout every vision model.

## Key Takeaways

- A convolution is a sliding kernel that detects local patterns
- `padding=1` with `kernel_size=3` preserves spatial dimensions
- `out_channels` controls how many different features the layer extracts
- The weights are learned — you don't hand-design kernels in practice

---

**Next:** [Object Detection vs Segmentation](0012-object-detection-vs-segmentation/)
