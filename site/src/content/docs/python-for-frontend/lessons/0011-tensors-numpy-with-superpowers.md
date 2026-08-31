---
title: "Tensors: NumPy with Superpowers"
description: "torch.Tensor vs np.ndarray — same shape/dtype mental model, plus GPU and gradient tracking"
level: intermediate
duration: "6 min"
weight: 11
---

You've been using `np.ndarray` — a typed, contiguous block of numbers with shape and dtype. A `torch.Tensor` is the same idea, plus two things NumPy can't do: run on GPU and track gradients.

## The mental model

```python
import numpy as np
import torch

# Same shape, same dtype, different wrapper
arr = np.array([1.0, 2.0, 3.0])       # ndarray
t   = torch.tensor([1.0, 2.0, 3.0])   # Tensor

arr.shape   # (3,)
t.shape     # torch.Size([3]) — same info, different container

arr.dtype   # float64
t.dtype     # torch.float32 — note: PyTorch defaults to 32-bit, NumPy to 64-bit
```

In JS terms: `torch.Tensor` and `np.ndarray` are like `Float32Array` vs `Float64Array` — same interface, different precision and backend. But tensors add GPU and autograd, which is the whole point.

## dtype promotion: the gotcha

```python
# NumPy defaults: float64, int64 (like JS always using Number = float64)
np.array([1.0]).dtype          # float64
np.array([1]).dtype            # int64

# PyTorch defaults: float32, int64 (ML models are float32 — saves GPU memory)
torch.tensor([1.0]).dtype      # torch.float32
torch.tensor([1]).dtype        # torch.int64

# Mixed arithmetic: PyTorch promotes to float32, NumPy to float64
x = torch.tensor([1.0])        # float32
y = torch.tensor([2.0])        # float32
(x + y).dtype                   # float32 — no promotion needed

# Convert between them
t.numpy()                       # Tensor → ndarray (copies data, CPU only)
torch.from_numpy(arr)           # ndarray → Tensor (shares memory, same dtype)
```

Think of it like TypeScript's type widening: `number[]` vs `Float32Array`. PyTorch is stricter about precision because GPU memory costs real money at scale.

## Moving to GPU

```python
# CPU tensor (default)
t = torch.tensor([1.0, 2.0, 3.0])
t.device    # cpu

# Move to GPU — like moving computation from main thread to Web Worker
# but with 100x+ speedup for matrix math
if torch.cuda.is_available():
    t_gpu = t.to("cuda")       # copies to GPU memory
    t_gpu.device                # cuda:0

    # All operations stay on GPU — no round trips
    result = t_gpu * 2 + 1
    result.device               # cuda:0

    # Bring back to CPU when you need NumPy or printing
    result.cpu().numpy()        # [3., 5., 7.]
```

The `.to()` method is like a smart cast — it handles device, dtype, or both:

```python
t.to("cuda")              # change device
t.to(torch.float64)       # change dtype
t.to(device="cuda", dtype=torch.float16)  # both
```

## view vs reshape

```python
t = torch.arange(12)       # [0, 1, ..., 11], shape (12,)

# Reshape: like NumPy — returns a new view when possible, copies when not
t.reshape(3, 4)            # shape (3, 4)

# view: ALWAYS a view (shared memory) — errors if data isn't contiguous
t.view(3, 4)               # same result, but fails if t isn't contiguous

# The JS analogy: view is like a typed-array view on an ArrayBuffer
# — same underlying bytes, different interpretation
# reshape is more forgiving but may silently copy

# When data IS contiguous (most cases), they're interchangeable
# When in doubt, use reshape — it always works
# When you need zero-copy guarantees, use view

# Make contiguous for view
t_noncontig = t.reshape(3, 4).t()   # transposed → non-contiguous
t_noncontig.view(12)                 # RuntimeError!
t_noncontig.contiguous().view(12)    # works — contiguous() copies if needed
```

## requires_grad: the superpower flag

```python
# Regular tensor — just a number container, like ndarray
x = torch.tensor([2.0, 3.0])

# Gradient-tracking tensor — PyTorch records every operation on it
x = torch.tensor([2.0, 3.0], requires_grad=True)

# Now operations build a computation graph
y = x * 2
z = y.sum()
z.backward()               # compute gradients
x.grad                      # tensor([2., 2.]) — dz/dx

# This is the autograd engine. We'll cover it in depth next lesson.
# For now: requires_grad=True is what makes a tensor "special"
```

## When to use NumPy vs PyTorch

| Task | Use | Why |
|------|-----|-----|
| Data loading, CSV, preprocessing | NumPy/pandas | CPU-native, integrates with scipy/sklearn |
| GPU computation, model training | PyTorch | GPU + autograd |
| Quick math, no GPU needed | NumPy | Lighter weight, no CUDA dependency |
| Model inference on GPU | PyTorch | Your model is already a tensor |

The rule of thumb: start with NumPy/pandas for data wrangling, convert to PyTorch tensors right before model code. The boundary is usually one line: `torch.from_numpy(X).to("cuda")`.

## Interop cheat sheet

```python
# NumPy ↔ PyTorch (zero-copy when on CPU, same dtype)
arr = np.array([1.0, 2.0], dtype=np.float32)
t = torch.from_numpy(arr)      # shares memory
t[0] = 99
arr[0]                          # 99.0 — same memory

# Back to NumPy
t.numpy()                       # shares memory, CPU only
t_gpu = t.to("cuda")
t_gpu.numpy()                   # RuntimeError! Must .cpu() first
t_gpu.cpu().numpy()             # works — copies GPU → CPU → NumPy
```

---

## Practice

1. Create a tensor of shape `(2, 3, 4)`, reshape it to `(6, 4)`, then view it as `(24,)`. Verify they share memory by modifying one.
2. Reproduce 5 operations from lesson 0006 (slicing, masking, axis-wise stats) using `torch` instead of `np`. Compare results with `torch.allclose()`.
Next: [Autograd: The Engine That Makes ML Work](0012-autograd-engine-that-makes-ml-work/)
