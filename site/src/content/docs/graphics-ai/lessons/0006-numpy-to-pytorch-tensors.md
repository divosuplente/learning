---
title: NumPy → PyTorch Tensors
description: "Bridge from Python arrays to GPU tensors. Shape, dtype, device, and the operations you'll use every day in ML pipelines."
level: beginner
duration: "5 min"
weight: 6
---

## The Bridge

You already know NumPy arrays. A [tensor](#) is the same idea — a multidimensional grid of numbers — with two extra powers: **autograd** (automatic differentiation) and **GPU acceleration**. PyTorch tensors are the data type every ML model consumes and produces.

Think of it as: `numpy.ndarray` + `requires_grad` + `.to("cuda")`.

## Creating Tensors

```python
import numpy as np
import torch

# From Python — the familiar way
a = torch.tensor([1.0, 2.0, 3.0])

# From NumPy — zero-copy sharing
np_arr = np.array([4.0, 5.0, 6.0])
b = torch.from_numpy(np_arr)      # shares memory with np_arr

# Back to NumPy
c = b.numpy()                      # shares memory with b

# Common factory functions (same names as NumPy)
zeros = torch.zeros(3, 4)          # 3×4 matrix of 0s
ones  = torch.ones(2, 3)           # 2×3 matrix of 1s
rand  = torch.randn(2, 3)          # 2×3 from standard normal
```

## Three Properties That Matter

Every tensor has a **shape**, a **dtype**, and a **device**. You'll check these constantly when debugging.

```python
t = torch.randn(2, 3, 4)

t.shape    # torch.Size([2, 3, 4]) — 2 batches, 3 rows, 4 cols
t.dtype    # torch.float32 — the default; use float16/float64 for specific needs
t.device   # cpu — until you move it

# Reshape (like numpy.reshape — same data, new view)
t.view(2, 12)        # torch.Size([2, 12])
t.reshape(6, 4)      # torch.Size([6, 4])

# Change dtype
t.float()             # float32
t.half()              # float16 — common on GPU for speed

# Move to GPU
if torch.cuda.is_available():
    t = t.to("cuda")  # now t.device == cuda:0
```

**Mnemonic from Spanish:** *forma, tipo, lugar* — shape, dtype, device. Get all three right or your model crashes.

## Operations

Most NumPy operations map directly. The syntax is nearly identical:

```python
x = torch.tensor([1.0, 2.0, 3.0])
y = torch.tensor([4.0, 5.0, 6.0])

x + y              # element-wise add
x * y              # element-wise multiply
x @ y              # dot product (1D), matrix multiply (2D+)
x.sum()            # scalar sum
x.mean()           # scalar mean
x.max()            # scalar max

# Broadcasting — same rules as NumPy
a = torch.randn(3, 1)
b = torch.randn(1, 4)
(a + b).shape      # torch.Size([3, 4]) — auto-expanded
```

## The One Thing NumPy Can't Do

```python
x = torch.tensor([2.0, 3.0], requires_grad=True)
y = (x ** 2).sum()
y.backward()
x.grad  # tensor([4., 6.]) — derivative of sum(x²) at each point
```

`requires_grad=True` tells PyTorch: "track every operation so I can compute gradients later." This is the engine behind every training loop. NumPy has no equivalent — it's pure math, no autodiff.

## Why This Matters for 3D AI

Every model you'll use in this course (SAMv2, GroundingDINO, NeRF) takes tensors in and spits tensors out. An image becomes a tensor of shape `[1, 3, H, W]` (batch, channels, height, width). A point cloud becomes `[N, 3]` (N points, xyz). Understanding shape and device errors is half the battle when wiring up a pipeline.

**Practice:** Open a Python REPL and run the code above. Then try creating a 4D tensor of shape `[2, 3, 224, 224]` (2 images, 3 RGB channels, 224×224 pixels — a standard model input). Move it to GPU if available.

---

**Next:** [C# in Unity — MonoBehaviour Lifecycle](0007-csharp-unity-monobehaviour/)
