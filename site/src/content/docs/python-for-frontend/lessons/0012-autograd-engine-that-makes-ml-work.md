---
title: "Autograd: The Engine That Makes ML Work"
description: "How PyTorch tracks operations and computes gradients automatically — the core mechanism behind every training step"
level: intermediate
duration: "6 min"
weight: 12
---

Training a model means: compute a loss, then nudge every parameter in the direction that reduces that loss. That "direction" is the **gradient** — the derivative of the loss with respect to each parameter. Autograd computes these derivatives automatically. No calculus required.

## The JS analogy

In JS, you don't think about how the garbage collector traces references — you just know objects get freed. Autograd is similar: you set `requires_grad=True` on your parameters, do math, call `.backward()`, and the gradients appear. The engine traces the computation graph behind the scenes.

## How the graph gets built

```python
import torch

# Start with gradient-tracking tensors
x = torch.tensor(2.0, requires_grad=True)
w = torch.tensor(3.0, requires_grad=True)
b = torch.tensor(1.0, requires_grad=True)

# Every operation with these tensors is recorded
y = w * x + b          # recorded: y = w*x + b
loss = (y - 7) ** 2    # recorded: loss = (y - 7)^2

# At this point, PyTorch has a graph:
#   x ──┐
#        ├─ * ── + ── -7 ── ^2 ── loss
#   w ──┘    │
#            b
#
# Every node knows its operation and parents.
# .backward() walks this graph in reverse, applying the chain rule.
```

## .backward() and .grad

```python
import torch

x = torch.tensor(2.0, requires_grad=True)
w = torch.tensor(3.0, requires_grad=True)
b = torch.tensor(1.0, requires_grad=True)

y = w * x + b           # y = 7
loss = (y - 10) ** 2    # loss = 9

loss.backward()

print(w.grad)   # tensor(-12.)  — 2*(7-10)*2 = -12 ✓
print(x.grad)   # tensor(-18.)  — 2*(7-10)*3 = -18 ✓
print(b.grad)   # tensor(-6.)   — 2*(7-10)*1 = -6  ✓

# The gradient tells you: increase w slightly → loss decreases (negative gradient)
# This is how training works: param = param - learning_rate * param.grad
```

## Gradient descent by hand

This is the essential loop — same one every optimizer runs internally:

```python
# Minimize f(x) = (x - 5)^2. We know the answer is x = 5.
x = torch.tensor(0.0, requires_grad=True)
lr = 0.1  # learning rate — how big a step to take

for step in range(30):
    loss = (x - 5) ** 2      # forward: compute loss
    loss.backward()           # backward: compute gradient

    # Update x: move opposite to gradient (hill descent)
    with torch.no_grad():     # don't track the update itself
        x -= lr * x.grad      # x = x - 0.1 * 2*(x-5)

    x.grad.zero_()            # reset gradient for next step (otherwise it accumulates!)
    print(f"step {step:2d}: x={x.item():.4f}, loss={loss.item():.4f}")

# x converges to 5.0 — the minimum
```

Note the three things you **must** do each step:
1. **`backward()`** — compute gradients
2. **Update under `no_grad()`** — don't track the parameter update as part of the graph
3. **`zero_()`** — reset gradients (they accumulate by default, which is almost never what you want)

## no_grad(): the inference context

```python
model_weight = torch.tensor([1.5, 2.0, -0.5], requires_grad=True)

# Training mode: gradients tracked (more memory, slower)
output = model_weight * torch.tensor([1.0, 1.0, 1.0])
output.sum().backward()
print(model_weight.grad)   # tensor([1., 1., 1.])

model_weight.grad.zero_()

# Inference mode: skip gradient tracking (less memory, faster)
with torch.no_grad():
    output = model_weight * torch.tensor([1.0, 1.0, 1.0])
    # output.backward()  — would error: no graph was built

# In JS terms: no_grad() is like running outside a React render cycle —
# no reactivity tracking, just a plain computation.
# You use it for evaluation, inference, and parameter updates.

# There's also the decorator form:
@torch.no_grad()
def predict(model, x):
    return model(x)
```

## Why gradients accumulate

```python
x = torch.tensor(3.0, requires_grad=True)

# First backward
loss1 = x ** 2
loss1.backward()
print(x.grad)   # tensor(6.) — d(x^2)/dx = 2x = 6

# Second backward WITHOUT zeroing — gradient ADDS to existing value
loss2 = x ** 2
loss2.backward()
print(x.grad)   # tensor(12.) — 6 + 6 = 12 (accumulated!)

# This is by design: it lets you accumulate gradients across multiple
# mini-batches before updating (gradient accumulation technique).
# But for a standard training loop, you zero_grad() every step.

x.grad.zero_()
loss3 = x ** 2
loss3.backward()
print(x.grad)   # tensor(6.) — correct again
```

## What breaks the graph

```python
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)

# ✅ In-place operations on leaf tensors break things
# x.add_(1)  — DON'T modify leaf tensors in-place

# ✅ Detaching from the graph
y = x * 2
z = y.detach()     # z is a new tensor with NO gradient tracking
# z.backward()     — would error, no graph

# ✅ Converting to NumPy
# y.numpy()        — would error if y.requires_grad
y.detach().numpy()  # works — detach first

# ✅ Using Python control flow
# This is fine — autograd traces the actual execution path
def dynamic_fn(x):
    if x.sum() > 0:
        return x * 2
    else:
        return x * -1
# The graph matches the branch that actually ran
```

## The big picture

Every training step is: **compute loss → `.backward()` → update params using `.grad` → `zero_grad()`**. Autograd makes the middle two steps automatic. You define the forward computation; PyTorch derives the backward pass for free.

In JS terms: autograd is like React deriving the DOM update from your render function. You describe *what* (the forward pass), the framework figures out *how* (the gradients).

---

## Practice

1. Define `f(x) = x^3 + 2x^2 - 5x + 1`. Compute `f'(3)` by hand, then verify with autograd.
2. Implement gradient descent on `f(x) = sin(x) + 0.1*x^2`. Start from `x=3.0`, find a local minimum. Print `x` and `loss` every 10 steps.
Next: [The Training Loop: The Pattern That Powers Everything](0013-training-loop-pattern/)
