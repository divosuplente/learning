---
title: Training Loop Anatomy
description: "The four-step cycle — forward, loss, backward, step — and what batch, epoch, and learning rate mean in practice."
level: beginner
duration: "7 min"
weight: 13
---

## The Loop in One Sentence

Show the model an example, measure how wrong it is, adjust weights to be less wrong, repeat.

## The Four Steps

```python
for images, labels in dataloader:
    # 1. Forward pass — model makes a prediction
    outputs = model(images)

    # 2. Loss computation — how wrong is the prediction?
    loss = loss_fn(outputs, labels)

    # 3. Backward pass — compute gradients (how to adjust each weight)
    optimizer.zero_grad()  # clear old gradients
    loss.backward()        # compute new gradients

    # 4. Optimizer step — update weights
    optimizer.step()
```

### Step 1: Forward Pass

Input flows through the network layer by layer. Convolutions extract features, linear layers combine them, the final layer outputs a prediction (class probabilities, bounding boxes, masks — depends on the task).

### Step 2: Loss

A scalar number measuring the gap between prediction and truth.

```python
# Classification: cross-entropy loss
loss_fn = nn.CrossEntropyLoss()

# Detection: sum of box regression + classification losses
# Segmentation: dice loss + cross-entropy on pixels
```

Lower loss = better predictions. The entire training objective is: minimize loss across all training data.

### Step 3: Backward Pass (Backpropagation)

`loss.backward()` computes the **gradient** of the loss with respect to every weight in the network. The gradient tells you: "if I nudge this weight up a tiny bit, does the loss go up or down?"

`optimizer.zero_grad()` is critical — gradients accumulate by default in PyTorch. If you don't zero them, each step adds to the previous gradients instead of replacing them.

### Step 4: Optimizer Step

The optimizer uses the gradients to update weights:

```python
# SGD — simplest optimizer
optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

# Adam — adaptive, most common default
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
```

The update rule for SGD: `weight = weight - lr × gradient`. The **learning rate** (`lr`) controls step size.

## Batch, Epoch, Learning Rate

**Batch** — a subset of training examples processed together. Computing gradients over a batch averages out noise and uses GPU parallelism.

**Epoch** — one full pass through the entire training dataset. If you have 1000 images and batch size 32, one epoch ≈ 31 iterations.

**Learning rate** — how big a step to take. Too high → overshoot, loss oscillates. Too low → converges slowly, may get stuck.

```python
# Typical training hyperparameters
batch_size = 32
learning_rate = 0.001
num_epochs = 10

# Learning rate schedule: start high, decay over time
scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.1)
# lr = 0.001 for epochs 1-3, 0.0001 for 4-6, 0.00001 for 7-9
```

## Complete Training Loop

```python
import torch
import torch.nn as nn

model = SimpleCNN()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
loss_fn = nn.CrossEntropyLoss()

for epoch in range(num_epochs):
    model.train()  # set training mode (enables dropout, batchnorm updates)

    for images, labels in train_loader:
        outputs = model(images)
        loss = loss_fn(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    # After each epoch: evaluate on validation set
    model.eval()  # set eval mode (disables dropout, batchnorm uses running stats)
    with torch.no_grad():  # no gradients needed for evaluation
        val_loss = 0
        correct = 0
        for images, labels in val_loader:
            outputs = model(images)
            val_loss += loss_fn(outputs, labels).item()
            correct += (outputs.argmax(1) == labels).sum().item()

    print(f"Epoch {epoch+1}: val_loss={val_loss:.3f}, accuracy={correct/len(val_set):.2%}")
    scheduler.step()  # adjust learning rate
```

## The Metaphor

Training is like learning to throw darts blindfolded: throw (forward), someone tells you how far off you are (loss), you adjust your stance (gradients + step). After enough throws, you consistently hit the board.

## Key Takeaways

- Training = forward → loss → backward → step, repeated across batches and epochs
- `zero_grad()` before `backward()` — always, or gradients accumulate silently
- `model.train()` for training, `model.eval()` for validation — they change dropout and batchnorm behavior
- Learning rate is the most important hyperparameter — too high breaks training, too low wastes time

---

**Next:** [Inference Pipeline](./0014-inference-pipeline.md)
