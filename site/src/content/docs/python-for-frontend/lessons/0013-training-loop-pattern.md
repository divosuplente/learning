---
title: "The Training Loop: The Pattern That Powers Everything"
description: "The 5-line pattern — forward → loss → zero_grad → backward → step — and how nn.Module composes layers like React components"
level: intermediate
duration: "7 min"
weight: 13
---

Every ML training script, from a toy example to GPT, runs the same 5-line loop. It's the `for` loop of machine learning — as fundamental as `Array.map()` is to JS.

## The 5-line pattern

```python
for X_batch, y_batch in dataloader:
    y_pred = model(X_batch)              # 1. forward pass
    loss = loss_fn(y_pred, y_batch)      # 2. compute loss
    optimizer.zero_grad()                # 3. reset gradients
    loss.backward()                      # 4. compute gradients
    optimizer.step()                     # 5. update parameters
```

In JS terms, this is like a React update cycle:
1. **Forward** = render: compute the output from current state (parameters)
2. **Loss** = diff: measure how far off you are from the target
3. **Backward** = reconciliation: figure out what to change
4. **Step** = commit: actually update the state
5. **Zero grad** = clean up: reset for next cycle

Let's build each piece.

## nn.Module: composable layers

`nn.Module` is the base class for everything with trainable parameters. It's like a React component — it holds state (parameters) and defines behavior (forward pass).

```python
import torch
import torch.nn as nn

# A linear layer: y = Wx + b (like a dense layer in Keras)
linear = nn.Linear(in_features=2, out_features=1)
print(linear.weight.shape)   # (1, 2) — the W matrix
print(linear.bias.shape)     # (1,)    — the b vector

# Forward pass: just call it like a function
x = torch.tensor([[1.0, 2.0]])
output = linear(x)           # shape (1, 1)
```

### Writing your own module

```python
class SimpleNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.layer1 = nn.Linear(2, 16)   # input → hidden
        self.relu = nn.ReLU()            # activation
        self.layer2 = nn.Linear(16, 1)   # hidden → output

    def forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        return x

model = SimpleNet()
```

The JS analogy: `nn.Module` is your base component class. `__init__` declares props/state (layers, parameters). `forward()` is your render function. Submodules compose just like components.

## nn.Sequential: layer composition

When your forward pass is just a linear chain of layers, `Sequential` saves you from writing a class:

```python
# These are equivalent:
model = nn.Sequential(
    nn.Linear(2, 16),
    nn.ReLU(),
    nn.Linear(16, 1),
)

# vs the explicit class above — same result, less boilerplate
# Like functional components vs class components in React:
# Sequential = functional, custom Module = class-based
```

## Loss functions

Loss functions measure the gap between prediction and target. They're your objective function — what training minimizes.

```python
import torch.nn.functional as F

# Regression: mean squared error
mse_loss = nn.MSELoss()
pred = torch.tensor([2.5, 0.0, 2.1])
target = torch.tensor([3.0, -0.5, 2.0])
mse_loss(pred, target)    # tensor(0.1700)

# Classification: cross-entropy (includes softmax — don't apply it yourself!)
ce_loss = nn.CrossEntropyLoss()
logits = torch.tensor([[2.0, 1.0, 0.1]])       # raw scores (3 classes)
target = torch.tensor([0])                       # class index
ce_loss(logits, target)                           # scalar loss

# Binary classification: BCE with logits (includes sigmoid)
bce_loss = nn.BCEWithLogitsLoss()
logit = torch.tensor([0.8])
target = torch.tensor([1.0])
bce_loss(logit, target)
```

The big gotcha: `CrossEntropyLoss` expects **raw logits**, not softmax outputs. If you apply softmax first, you'll get wrong gradients. This is the `onclick` vs `onClick` of PyTorch — everyone trips on it once.

## The complete training loop

```python
import torch
import torch.nn as nn

# ---- Data ----
X = torch.randn(100, 2)                     # 100 samples, 2 features
y = (X[:, 0] * 3 + X[:, 1] * -1 + 0.5)     # simple linear relation
y = y.unsqueeze(1)                           # shape (100, 1)

# ---- Model ----
model = nn.Sequential(
    nn.Linear(2, 16),
    nn.ReLU(),
    nn.Linear(16, 1),
)

# ---- Optimizer ----
# SGD with learning rate 0.01
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

# ---- Loss ----
loss_fn = nn.MSELoss()

# ---- Train ----
for epoch in range(200):
    # Forward
    y_pred = model(X)
    loss = loss_fn(y_pred, y)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    if epoch % 50 == 0:
        print(f"epoch {epoch:3d}: loss = {loss.item():.4f}")

# Final loss should be well under 0.1
```

Let's translate each line for a JS dev:

| Line | JS equivalent | What it does |
|------|--------------|--------------|
| `y_pred = model(X)` | `const output = render(props)` | Forward: compute predictions |
| `loss = loss_fn(y_pred, y)` | `const diff = distance(output, expected)` | Measure error |
| `loss.backward()` | — (no JS equivalent) | Compute all gradients via chain rule |
| `optimizer.step()` | `state = nextState(state)` | Update parameters using gradients |
| `optimizer.zero_grad()` | — cleanup for next iteration | Reset gradients |

## Optimizers: SGD and Adam

```python
# SGD: vanilla stochastic gradient descent
# param = param - lr * grad
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

# Adam: adaptive learning rate per parameter (the default choice for most work)
# Like auto-tuning the step size — faster convergence, less tuning
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

# When in doubt, use Adam with lr=0.001. It's the create-react-app of optimizers —
# it works well enough to get started, and you can tune later.
```

## Mini-batching (simplified)

The loop above uses the full dataset each step (batch gradient descent). Real training uses mini-batches:

```python
from torch.utils.data import TensorDataset, DataLoader

dataset = TensorDataset(X, y)
loader = DataLoader(dataset, batch_size=16, shuffle=True)

for epoch in range(50):
    for X_batch, y_batch in loader:       # iterate mini-batches
        y_pred = model(X_batch)
        loss = loss_fn(y_pred, y_batch)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
```

We'll cover `Dataset` and `DataLoader` in depth next lesson. For now: `DataLoader` is like chunking an array into batches with `_.chunk(data, 16)` — but it also shuffles and loads in parallel.

---

## Practice

1. Build a 2-layer MLP on synthetic data (the example above). Train it. Print the loss curve (just `print` the loss every 20 epochs).
2. Change the hidden layer from 16 to 64 neurons. Observe: does training converge faster or slower? Why?
3. Replace `SGD` with `Adam` at `lr=0.001`. Observe the convergence speed difference.
Next: [DataLoader, Datasets, and Real Data](./0014-dataloader-datasets-real-data.md)
