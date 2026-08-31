---
title: "Reading and Modifying Real ML Code"
description: "Anatomy of a real PyTorch project — model.py, train.py, data.py, config.yaml — and how to navigate, modify, and fine-tune existing code"
level: intermediate
duration: "7 min"
weight: 15
---

# Reading and Modifying Real ML Code

You know tensors, autograd, training loops, and data pipelines. Now let's read code the way you'll encounter it in the wild — split across files, driven by config, with checkpointing, scheduling, and device management. This is the lesson that ties everything together.

## Anatomy of a PyTorch project

A well-organized project looks like this:

```
my_project/
├── config.yaml        ← hyperparameters (like .env for ML)
├── data.py            ← Dataset, DataLoader, transforms
├── model.py           ← nn.Module definitions
├── train.py           ← training loop, logging, checkpointing
└── utils.py           ← metrics, helpers
```

In JS terms: `config.yaml` is your `.env`, `model.py` is your component file, `train.py` is your entry point, and `data.py` is your API/data-fetching layer.

## config.yaml

```yaml
# config.yaml — all tunable knobs in one place
model:
  hidden_dim: 128
  num_layers: 3
  dropout: 0.1

training:
  learning_rate: 0.001
  batch_size: 32
  epochs: 50
  optimizer: adam

data:
  train_path: data/train.csv
  val_path: data/val.csv
  num_workers: 4

device: cuda          # cuda | cpu
checkpoint_dir: checkpoints/
```

```python
# Load config — like dotenv in Node
import yaml

with open("config.yaml") as f:
    config = yaml.safe_load(f)

lr = config["training"]["learning_rate"]
device = config["device"]
```

Why a config file? Hyperparameters change constantly. You don't want to dig through Python code to change the learning rate any more than you want to hardcode API URLs in components.

## model.py

```python
import torch.nn as nn

class MyModel(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_layers, dropout):
        super().__init__()
        layers = []
        in_dim = input_dim
        for _ in range(num_layers):
            layers.extend([
                nn.Linear(in_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),     # randomly zero outputs during training
            ])
            in_dim = hidden_dim
        layers.append(nn.Linear(hidden_dim, 1))  # output layer
        self.network = nn.Sequential(*layers)

    def forward(self, x):
        return self.network(x)
```

`Dropout` is worth explaining: during training, it randomly zeroes some outputs (like randomly disabling neurons). This prevents overfitting — the model can't rely on any single path. During evaluation (`.eval()` mode), dropout is disabled. It's like adding random noise to your CSS during development to make sure your layout doesn't depend on exact pixel values.

## data.py

```python
import torch
from torch.utils.data import Dataset, DataLoader
import pandas as pd

class TabularDataset(Dataset):
    def __init__(self, csv_path, feature_cols, target_col):
        df = pd.read_csv(csv_path).dropna()
        features = df[feature_cols].values.astype("float32")
        targets = df[target_col].values.astype("float32")
        self.X = torch.from_numpy(features)
        self.y = torch.from_numpy(targets)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


def get_loaders(config):
    train_ds = TabularDataset(config["data"]["train_path"], ["sqft", "beds"], "price")
    val_ds = TabularDataset(config["data"]["val_path"], ["sqft", "beds"], "price")
    train_loader = DataLoader(
        train_ds,
        batch_size=config["training"]["batch_size"],
        shuffle=True,
        num_workers=config["data"]["num_workers"],
        pin_memory=True,
    )
    val_loader = DataLoader(val_ds, batch_size=64, shuffle=False)
    return train_loader, val_loader
```

## train.py — the real thing

This is what a production training script looks like. It's longer than the toy loops we've written, but every piece maps to something you already know:

```python
import torch
import torch.nn as nn
import yaml
from pathlib import Path

from model import MyModel
from data import get_loaders

def train(config):
    # ---- Device management ----
    device = torch.device(config["device"] if torch.cuda.is_available() else "cpu")
    print(f"Training on {device}")

    # ---- Data ----
    train_loader, val_loader = get_loaders(config)

    # ---- Model ----
    model = MyModel(
        input_dim=3,
        hidden_dim=config["model"]["hidden_dim"],
        num_layers=config["model"]["num_layers"],
        dropout=config["model"]["dropout"],
    ).to(device)                                    # move model to GPU

    # ---- Optimizer ----
    optimizer = torch.optim.Adam(model.parameters(), lr=config["training"]["learning_rate"])

    # ---- LR Scheduler ----
    # Reduce learning rate when validation loss plateaus
    # Like auto-scaling: if you're stuck, take smaller steps
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", patience=5, factor=0.5
    )

    loss_fn = nn.MSELoss()
    best_val_loss = float("inf")

    # ---- Training ----
    for epoch in range(config["training"]["epochs"]):
        # Train
        model.train()
        train_loss = 0
        for X, y in train_loader:
            X, y = X.to(device), y.to(device)       # move batch to GPU
            pred = model(X)
            loss = loss_fn(pred.squeeze(), y)
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
            train_loss += loss.item()
        train_loss /= len(train_loader)

        # Validate
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for X, y in val_loader:
                X, y = X.to(device), y.to(device)
                pred = model(X)
                val_loss += loss_fn(pred.squeeze(), y).item()
        val_loss /= len(val_loader)

        # LR scheduling
        scheduler.step(val_loss)

        # ---- Checkpointing ----
        # Save the best model — like git commit: snapshot of good state
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            checkpoint = {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),      # all parameters
                "optimizer_state_dict": optimizer.state_dict(),  # optimizer state
                "val_loss": val_loss,
            }
            ckpt_dir = Path(config["checkpoint_dir"])
            ckpt_dir.mkdir(exist_ok=True)
            torch.save(checkpoint, ckpt_dir / "best.pt")

        if epoch % 10 == 0:
            current_lr = optimizer.param_groups[0]["lr"]
            print(f"epoch {epoch:3d} | train: {train_loss:.4f} | val: {val_loss:.4f} | lr: {current_lr:.6f}")

    return model


if __name__ == "__main__":
    with open("config.yaml") as f:
        config = yaml.safe_load(f)
    train(config)
```

## Loading a checkpoint

```python
# Resume training or use a saved model for inference
model = MyModel(input_dim=3, hidden_dim=128, num_layers=3, dropout=0.1)
checkpoint = torch.load("checkpoints/best.pt", weights_only=True)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

# The JS analogy: loading a checkpoint is like hydrating server-rendered HTML —
# you're restoring the full state from a serialized snapshot, no re-computation needed.
```

## Key patterns decoded

### Device management

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Three things must be on the same device: model, input tensors, target tensors
model = model.to(device)               # once, after creation
X, y = X.to(device), y.to(device)      # every batch in the loop

# If model is on GPU but data is on CPU (or vice versa), you get a RuntimeError
# This is the "undefined is not a function" of PyTorch — the error you see most often
```

### LR schedulers

```python
# StepLR: decay by factor every N epochs
scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.1)
# lr=0.001 for epochs 0-9, lr=0.0001 for 10-19, etc.

# ReduceLROnPlateau: decay when loss stops improving
scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
# Called with: scheduler.step(val_loss)

# CosineAnnealing: smooth decay following a cosine curve
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=50)
```

### Checkpointing

```python
# Save
torch.save({
    "epoch": epoch,
    "model_state_dict": model.state_dict(),     # the weights
    "optimizer_state_dict": optimizer.state_dict(),  # momentum etc.
    "loss": loss,
}, "checkpoint.pt")

# Load
ckpt = torch.load("checkpoint.pt", weights_only=True)
model.load_state_dict(ckpt["model_state_dict"])
# For resuming training, also load optimizer state:
optimizer.load_state_dict(ckpt["optimizer_state_dict"])
```

## Fine-tuning vs training from scratch

```python
# From scratch: random initialization
model = MyModel(input_dim=3, hidden_dim=128, num_layers=3, dropout=0.1)

# Fine-tuning: start from a pretrained model, replace the head
pretrained = torch.load("pretrained_model.pt", weights_only=True)
model = MyModel(input_dim=3, hidden_dim=128, num_layers=3, dropout=0.1)
model.load_state_dict(pretrained)                        # load all weights

# Option 1: Freeze earlier layers (don't update them)
for param in model.network[:-1].parameters():           # freeze everything except last layer
    param.requires_grad = False

# Option 2: Use a smaller learning rate for pretrained layers
optimizer = torch.optim.Adam([
    {"params": model.network[:-1].parameters(), "lr": 1e-5},   # pretrained: small lr
    {"params": model.network[-1].parameters(), "lr": 1e-3},    # new head: normal lr
])

# Fine-tuning is like forking a repo: you get all the existing work,
# then modify just the parts you need. The pretrained weights are the
# shared code; the new head is your custom feature branch.
```

## Reading a training script cold

When you open an unfamiliar ML project, read in this order:

1. **`config.yaml`** — what are the hyperparameters? What data paths?
2. **`model.py`** — what's the architecture? How many layers, what sizes?
3. **`data.py`** — what's the input format? What preprocessing?
4. **`train.py`** — how does the loop work? What optimizer, scheduler, checkpointing?

Look for these patterns and you can read any PyTorch project:

| Pattern | What it does | JS equivalent |
|---------|-------------|---------------|
| `model.to(device)` | Move to GPU/CPU | Assigning worker context |
| `model.train()` / `model.eval()` | Toggle training/eval mode | StrictMode vs production |
| `with torch.no_grad():` | Skip gradient tracking | Outside React render scope |
| `scheduler.step()` | Adjust learning rate | Auto-scaling config |
| `torch.save()` / `torch.load()` | Serialize/deserialize model | `JSON.stringify` / `JSON.parse` for state |
| `requires_grad = False` | Freeze a layer | `Object.freeze()` on params |

---

## Practice

1. Find a PyTorch tutorial on [pytorch.org/tutorials](https://pytorch.org/tutorials/) (e.g., "Training a Classifier"). Read it and identify: config, model, data, training loop, checkpointing.
2. Take the `train.py` script from this lesson. Modify it: change the learning rate, add a second hidden layer, switch from Adam to SGD with momentum. Run it.
3. Simulate fine-tuning: train a model for 20 epochs, save the checkpoint. Load the checkpoint, freeze all but the last layer, and "fine-tune" for 10 more epochs.

---

You've made it. Fifteen lessons ago you knew Python only through the lens of JavaScript. Now you can read tensors, trace autograd graphs, write training loops, build data pipelines, and navigate real ML codebases. The gap between "frontend engineer" and "someone who can read and modify ML code" is smaller than it looked. Go build something.
