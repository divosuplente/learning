---
title: "Model Deployment — ONNX, TorchScript, and Serving"
description: "Getting a trained model into production — export formats, containerized serving, and the latency vs throughput tradeoff."
level: intermediate
duration: "6 min"
weight: 19
---

## The Last Mile

You've loaded a model in Python and run `model.predict()`. That's research. **Deployment** is making that prediction available to other systems — reliably, fast, and at scale.

The pipeline: PyTorch model → export → serve in a container → accept HTTP/gRPC requests → return predictions.

## Export Formats

### TorchScript

PyTorch's native export. Traces or scripts your model into a static computation graph that runs without Python.

```python
import torch

model = load_my_model()
model.eval()

# Trace: run one example input, record the ops
scripted = torch.jit.trace(model, torch.randn(1, 3, 224, 224))
scripted.save("model.pt")
```

- **Pros**: Full PyTorch feature support, easy to load back in Python (`torch.jit.load`)
- **Cons**: Python-only runtime, no cross-framework interop, dynamic control flow can break tracing

### ONNX

An open standard for representing ML models. Export once, run anywhere — Python, C++, C#, JS, or specialized runtimes.

```python
import torch

model = load_my_model()
model.eval()

torch.onnx.export(
    model,
    torch.randn(1, 3, 224, 224),
    "model.onnx",
    input_names=["image"],
    output_names=["output"],
    dynamic_axes={"image": {0: "batch"}, "output": {0: "batch"}},
)
```

- **Pros**: Cross-platform, supported by Azure ML, ONNX Runtime (C#/C++/Python), hardware acceleration
- **Cons**: Not all PyTorch ops are supported, complex models may need export debugging
- **Why it matters for Plain Concepts**: ONNX Runtime has a C# API — you can run models directly in Unity/Evergine without Python

### When to Use Which

| Scenario | Pick |
|----------|------|
| Python-only serving | TorchScript |
| C# engine integration | ONNX |
| Azure ML deployment | ONNX |
| Maximum GPU throughput | ONNX Runtime with CUDA EP |
| Quick prototype, no infra | Just use PyTorch directly |

## Serving Models

### Container Pattern

```dockerfile
FROM python:3.11-slim

# Install dependencies
RUN pip install onnxruntime torch torchvision

# Copy model and server code
COPY model.onnx /models/
COPY server.py /app/

WORKDIR /app
EXPOSE 8000

CMD ["python", "server.py"]
```

```python
# server.py — minimal FastAPI serving
from fastapi import FastAPI
import onnxruntime as ort
import numpy as np

app = FastAPI()
session = ort.InferenceSession("/models/model.onnx", providers=["CUDAExecutionProvider"])

@app.post("/predict")
def predict(image_bytes: bytes):
    image = preprocess(image_bytes)  # decode, resize, normalize
    result = session.run(None, {"image": image})
    return postprocess(result)
```

### Managed Options

- **Azure ML Endpoints**: managed GPU containers, auto-scaling, A/B deployment
- **TorchServe**: PyTorch's official serving library, handles batching and model versioning
- **Triton Inference Server** (NVIDIA): multi-framework, dynamic batching, the production-grade option

## Latency vs Throughput

This is the central tradeoff in model serving:

- **Latency**: time from request to response (per-user experience)
- **Throughput**: predictions per second (total system capacity)

**Batching** increases throughput at the cost of latency: wait a few ms to collect multiple requests, run them together on the GPU. GPU utilization goes up, but each user waits slightly longer.

```
No batching:   1 request → 1 GPU call → 20ms latency, 50 req/s
Batching (4):  4 requests → 1 GPU call → 35ms latency, 114 req/s
```

For real-time 3D applications (AR/VR, interactive segmentation), optimize for latency — low batching, maybe even ONNX Runtime with TensorRT. For batch processing (scan a folder of images), optimize for throughput — large batches, fill the GPU.

**Rule of thumb**: If the user is waiting for the result (< 100ms feels instant), optimize latency. If the result goes into a queue, optimize throughput.

## What to Know for Interviews

- **Export**: ONNX for cross-platform (especially C# engines), TorchScript for Python-only
- **Serving**: containerize with FastAPI or use managed endpoints (Azure ML)
- **Tradeoff**: latency (real-time) vs throughput (batch) — explain which you'd pick for a given scenario
- **Real-world signal**: "We deployed FlorenceV2 as ONNX in an Azure container instance, 50ms p99 latency, auto-scaling to 4 replicas at peak" — this is the kind of statement that shows engineering maturity, not just model knowledge

---

This completes **M4: Modern Vision Models**. You can now compare SAMv2, GroundingDINO, and FlorenceV2 on their input/output contracts, understand why transformers replaced CNNs in vision, and describe how to deploy a model to production.

**Next milestone:** [M5 — 3D AI: Reconstruction & Rendering](0020-point-clouds/)
