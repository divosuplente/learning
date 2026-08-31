---
title: Vision Transformers — How Transformers Replaced CNNs
description: "Image patches, self-attention, and positional encoding — why modern vision models look more like language models than convolutional networks."
level: intermediate
duration: "5 min"
weight: 18
---

## The Shift

Every model in this milestone — SAMv2, GroundingDINO, FlorenceV2 — uses transformer components. Not CNNs. Understanding Vision Transformers (ViT) is understanding the architecture behind modern computer vision.

The shift: CNNs look at images through a **sliding window** (convolution). ViTs look at images as a **set of patches** with global attention between them.

## How ViT Works (3 Steps)

### 1. Patch Embedding

Split the image into fixed-size patches (typically 16×16 pixels). Linearly project each patch into an embedding vector.

A 224×224 image → 14×14 = 196 patches. Each patch becomes one token — exactly like a word token in a language model.

```
Image (224×224×3)
  → split into 16×16 patches
  → 196 patches, each flattened and projected
  → sequence of 196 embeddings
```

### 2. Self-Attention

Every patch attends to every other patch. This is the key difference from CNNs — convolution only sees local neighborhoods; self-attention sees the whole image from layer one.

For each patch, self-attention computes:
- **Query**: "what am I looking for?"
- **Key**: "what do I contain?"
- **Value**: "what information do I pass along?"

The attention weight between patch A and patch B is `softmax(Q_A · K_B / √d)`. High weight = these patches are relevant to each other, even if they're far apart spatially.

> **Analogy:** A CNN is like reading a book through a magnifying glass — you see details but lose context. Self-attention is like reading the whole page at once and connecting related ideas across distances.

### 3. Positional Encoding

Patches alone have no spatial order — the model doesn't know which patch is top-left vs bottom-right. Positional encoding adds a position signal to each patch embedding.

This is learned (unlike the original Transformer's fixed sinusoidal encoding). The model learns that patches near each other should interact differently than distant ones.

## ViT vs CNN — The Core Tradeoff

| | CNN | ViT |
|---|---|---|
| **Receptive field** | Grows layer by layer | Global from layer 1 |
| **Inductive bias** | Strong (translation equivariance, locality) | Weak (must learn these) |
| **Data hunger** | Works well on small datasets | Needs large data (or pretraining) |
| **Long-range dependencies** | Hard (need many layers) | Easy (single attention step) |
| **Compute** | Efficient for local ops | Quadratic in patch count |

ViTs need more data because they have fewer built-in assumptions. CNNs "know" that nearby pixels are related; ViTs must learn this. But with enough data, ViTs outperform CNNs because they can learn arbitrary spatial relationships.

## Why This Matters for Graphics AI

The models you'll use at Plain Concepts aren't pure ViTs — they're **hybrids**:

- **SAMv2**: uses a Hiera backbone (hierarchical image transformer) — ViT with multi-scale features (like CNN feature pyramids)
- **GroundingDINO**: Swin Transformer backbone — shifted windows give local + global attention efficiently
- **FlorenceV2**: DaViT backbone — dual attention (spatial + channel) for efficient processing

You don't need to implement attention from scratch. But when someone asks "why did these models move away from CNNs?", the answer is: **global receptive field from layer one beats stacking local filters, given enough data.**

## The One Diagram to Remember

```
Image → Patches → [+ Position] → Transformer Encoder (×N) → Output
         ↑              ↑
    flattens 16×16    learnable
    into 1 vector     position IDs
```

Each transformer encoder block: LayerNorm → Multi-Head Self-Attention → LayerNorm → MLP → residual connections. Same block as GPT/BERT, applied to visual tokens instead of text tokens.

## What to Know for Interviews

- ViT patches an image like a language model patches a sentence
- Self-attention gives global context immediately (CNNs need depth for this)
- The tradeoff: less inductive bias = more data needed, but better performance at scale
- Modern vision models use hybrid architectures (Swin, Hiera) that combine ViT's global attention with CNN-like efficiency

---

**Next:** [Model Deployment — ONNX, TorchScript, and Serving](./0019-model-deployment.md)
