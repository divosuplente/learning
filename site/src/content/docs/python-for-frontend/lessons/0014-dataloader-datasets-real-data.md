---
title: "DataLoader, Datasets, and Real Data"
description: "Custom Dataset classes, DataLoader batching and shuffling, and transforms — the bridge between raw data and training loops"
level: intermediate
duration: "6 min"
weight: 14
---

You've written a training loop. But it operated on `torch.randn()` — toy data. Real ML starts with messy CSVs, images, or text. `Dataset` and `DataLoader` are the pipeline that turns raw data into batched tensors your model can eat.

## Dataset: an iterable with a contract

A `Dataset` is any class with `__len__` and `__getitem__`. You already know dunders from lesson 0004 — this is where they pay off.

```python
from torch.utils.data import Dataset

class CSVDataset(Dataset):
    """Wrap a pandas DataFrame as a PyTorch dataset."""
    def __init__(self, dataframe, feature_cols, target_col):
        self.features = torch.tensor(
            dataframe[feature_cols].values, dtype=torch.float32
        )
        self.targets = torch.tensor(
            dataframe[target_col].values, dtype=torch.float32
        )

    def __len__(self):
        return len(self.features)           # like array.length

    def __getitem__(self, idx):
        return self.features[idx], self.targets[idx]
```

The JS equivalent: an object implementing `[Symbol.iterator]` or a `length` + index protocol. But `__getitem__` also supports slicing and custom indexing — more like a Proxy with a `get` trap.

### Using it

```python
import pandas as pd
import torch
from torch.utils.data import Dataset

# Real data: load CSV, clean, wrap
df = pd.read_csv("housing.csv")
df = df.dropna()

dataset = CSVDataset(
    dataframe=df,
    feature_cols=["sqft", "bedrooms", "bathrooms"],
    target_col="price",
)

# Iterate like any collection
features, target = dataset[0]         # first sample
print(features)                        # tensor([sqft, beds, baths])
print(target)                          # tensor(price)
print(len(dataset))                    # number of samples
```

## DataLoader: batching, shuffling, parallel loading

`DataLoader` wraps a `Dataset` and handles the practical concerns of training:

```python
from torch.utils.data import DataLoader

# Like turning an array into a paginated, shuffled, async stream
loader = DataLoader(
    dataset,
    batch_size=32,       # chunk size — like _.chunk(array, 32)
    shuffle=True,        # randomize order each epoch
    num_workers=0,       # parallel loading (0 = main thread, like JS single-thread)
    drop_last=False,     # keep the last partial batch
)

# Iterate: each iteration gives a BATCH, not a single sample
for X_batch, y_batch in loader:
    print(X_batch.shape)    # (32, 3) — batch_size × features
    print(y_batch.shape)    # (32,)   — batch_size targets
    break
```

### Why batching matters

```python
# Full batch (1 iteration = entire dataset)
# — Stable gradients, but slow per step, won't fit in GPU memory
loader_full = DataLoader(dataset, batch_size=len(dataset))

# Mini-batch (the default approach)
# — Noisy gradients (good — helps escape local minima), fits in GPU memory
loader_mini = DataLoader(dataset, batch_size=32)

# Stochastic (batch_size=1)
# — Very noisy, slow, but useful for online learning
loader_sgd = DataLoader(dataset, batch_size=1)
```

Batch size is a hyperparameter. Common values: 16, 32, 64, 128, 256. Larger = faster but more GPU memory. Start with 32.

### num_workers: parallel data loading

```python
# CPU-bound preprocessing? Use workers to load in parallel
loader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,
    num_workers=4,      # 4 background processes, like worker threads
    pin_memory=True,    # faster GPU transfer (like pre-allocating buffers)
)

# In JS terms: num_workers is like spinning up Web Workers for data fetching.
# The GPU is your main thread — you want data ready when it's needed,
# not waiting on CPU preprocessing.
```

## Train/validation split

```python
from torch.utils.data import random_split

# 80/20 split — like splitting your dataset before training in JS
train_size = int(0.8 * len(dataset))
val_size = len(dataset) - train_size
train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)  # no shuffle needed

# Training with validation:
for epoch in range(100):
    model.train()
    for X_batch, y_batch in train_loader:
        # ... training step (lesson 0013) ...

    model.eval()
    with torch.no_grad():
        val_loss = 0
        for X_batch, y_batch in val_loader:
            y_pred = model(X_batch)
            val_loss += loss_fn(y_pred, y_batch).item()
        val_loss /= len(val_loader)
    print(f"epoch {epoch}: val_loss = {val_loss:.4f}")
```

The `.train()` / `.eval()` modes affect layers like `Dropout` and `BatchNorm` — they behave differently during training vs inference. Like React's StrictMode running effects twice in development.

## Transforms: preprocessing on load

Transforms modify data as it's loaded — normalization, augmentation, type conversion.

```python
from torchvision import transforms

# For images: a pipeline of transformations
transform = transforms.Compose([
    transforms.ToTensor(),                          # PIL Image → Tensor
    transforms.Normalize(                           # normalize to mean=0, std=1
        mean=[0.485, 0.456, 0.406],               # ImageNet stats
        std=[0.229, 0.224, 0.225],
    ),
    transforms.RandomHorizontalFlip(p=0.5),        # data augmentation
])

# For tabular: implement in __init__ or __getitem__
class NormalizedCSVDataset(Dataset):
    def __init__(self, df, feature_cols, target_col):
        features = df[feature_cols].values
        # Z-score normalization (like CSS transform: scale to unit range)
        self.mean = features.mean(axis=0)
        self.std = features.std(axis=0)
        features = (features - self.mean) / self.std

        self.features = torch.tensor(features, dtype=torch.float32)
        self.targets = torch.tensor(df[target_col].values, dtype=torch.float32)

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return self.features[idx], self.targets[idx]
```

## End-to-end: CSV → Dataset → DataLoader → Training

```python
import torch
import torch.nn as nn
import pandas as pd
from torch.utils.data import Dataset, DataLoader, random_split

# 1. Load and clean
df = pd.read_csv("housing.csv").dropna()

# 2. Dataset
dataset = NormalizedCSVDataset(
    df,
    feature_cols=["sqft", "bedrooms", "bathrooms"],
    target_col="price",
)

# 3. Split
train_ds, val_ds = random_split(dataset, [int(0.8 * len(dataset)), int(0.2 * len(dataset))])
train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
val_loader = DataLoader(val_ds, batch_size=64)

# 4. Model
model = nn.Sequential(
    nn.Linear(3, 32),
    nn.ReLU(),
    nn.Linear(32, 1),
)

# 5. Train
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
loss_fn = nn.MSELoss()

for epoch in range(100):
    model.train()
    for X, y in train_loader:
        pred = model(X)
        loss = loss_fn(pred.squeeze(), y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
```

This is the **minimal end-to-end pattern**. Every real project adds more (logging, checkpointing, scheduling), but the skeleton is always: load → dataset → dataloader → model → loop.

---

## Practice

1. Wrap a pandas DataFrame (use `pd.DataFrame(np.random.randn(200, 4))`) in a custom `Dataset`. Iterate through it and print the first 3 samples.
2. Build a `DataLoader` with `batch_size=16` and `shuffle=True`. Iterate one epoch and print each batch shape.
Next: [Reading and Modifying Real ML Code](0015-reading-real-ml-code/)
