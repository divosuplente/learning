---
title: Deploying 3D AI
description: "Cloud GPU instances, containerizing PyTorch models, and the model-size-vs-latency tradeoff that matters in production."
level: advanced
duration: "6 min"
weight: 27
---

## Why Deployment Matters for This Role

Plain Concepts builds real applications for clients. A model that only runs in a notebook doesn't ship. You need to explain how your prototype would run on a cloud GPU, how you'd containerize it, and what the latency story looks like.

## Cloud GPU Instances

### The Big Three

| Provider | Service | GPU Options | When to Pick |
|---|---|---|---|
| Azure | Azure ML Compute | NC-series (T4, A100) | You already know Azure. Same portal, same auth. |
| AWS | SageMaker | P-series (A10G, A100) | Client is on AWS. |
| GCP | Vertex AI | L4, A100 | Client is on GCP. |

For the interview, Azure ML is your default answer — it's your existing experience. SageMaker and Vertex AI are the same mental model: provision a GPU, push a Docker image, hit an endpoint.

### What "Provisioning a GPU Instance" Actually Means

1. Pick a VM size with a GPU (e.g., Azure `Standard_NC6s_v3` = 1× V100)
2. Select a prebuilt DLVM image (PyTorch + CUDA pre-installed)
3. SSH in or use Jupyter on the instance
4. Run your training or inference code

That's it. You're not configuring CUDA drivers — the image handles that.

```bash
# Azure ML — submit a job from your laptop
az ml job create --file job.yml --resource-group my-rg --workspace my-ws
```

## Containerizing PyTorch Models

### Why Containerize?

Reproducibility. "Works on my machine" kills deployment. A Docker image pins the Python version, CUDA version, model weights, and dependencies into one artifact that runs the same everywhere.

### The Minimal Dockerfile

```dockerfile
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Model weights — either baked in or downloaded at startup
RUN python -c "from sam2 import SAM2ImagePredictor; SAM2ImagePredictor.from_pretrained('facebook/sam2-hiera-large')"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Key choices:**
- `runtime` image (not `devel`) — smaller, no compiler toolchain. Use for inference only.
- Download model weights at build time — avoids runtime downloads that fail in air-gapped environments.
- `uvicorn` for FastAPI — async, production-grade ASGI server.

### Build → Push → Deploy

```bash
docker build -t my-registry.azurecr.io/3d-segmenter:v1 .
docker push my-registry.azurecr.io/3d-segmenter:v1
# Azure ML or AKS pulls the image and runs it on GPU nodes
```

## Model Size vs Latency

This is the production tradeoff interviewers probe. Bigger models are more accurate but slower and more expensive.

### The Numbers That Matter

| Model | Params | Weights Size | Inference (T4) | Inference (A100) |
|---|---|---|---|---|
| SAMv2 Hiera Large | ~224M | ~890 MB | ~300 ms | ~80 ms |
| SAMv2 Hiera Small | ~46M | ~184 MB | ~80 ms | ~25 ms |
| GroundingDINO-Tiny | ~70M | ~660 MB | ~150 ms | ~40 ms |

*(Approximate. Actual times depend on input resolution and batching.)*

### The Decision Framework

1. **What's the latency budget?** Real-time (< 100 ms) → SAMv2 Small or ONNX-optimized. Batch processing → use the Large model freely.
2. **What's the cost budget?** A100 is ~3× the price of T4. A Small model on T4 might beat a Large model on A100 for the same money.
3. **Can you batch?** Processing 10 images at once on a GPU is far more efficient than 1×10 sequentially. If your use case allows batching, you can use a bigger model without more hardware.

### Optimization Levers

- **ONNX Runtime:** Export PyTorch model → ONNX → run with ONNX Runtime. Typically 1.5–3× faster inference on the same hardware. No code changes to the model.
- **TensorRT (NVIDIA):** Heavy optimization for NVIDIA GPUs. More setup, bigger speedup. Worth it for production, overkill for prototype.
- **Quantization (INT8/FP16):** Halve memory, 1.5–2× speedup, small accuracy loss. PyTorch supports `torch.quantization` and `model.half()` out of the box.

```python
# The quickest win — FP16 inference
model = model.half().cuda()  # float32 → float16
with torch.inference_mode():
    output = model(input_tensor.half())
```

## What to Say

> "I'd containerize the inference pipeline with a PyTorch CUDA runtime image and serve it via FastAPI. For the cloud, Azure ML compute with a T4 GPU — good enough for a prototype, easy to scale up. If latency matters, I'd profile first, then apply ONNX export and FP16 quantization. You typically get 2–3× speedup without accuracy loss."

This shows you understand the path from "works in a notebook" to "runs in production" without overcomplicating it.

---

**Next:** [Case Study Walkthrough](./0028-case-study-walkthrough.md)
