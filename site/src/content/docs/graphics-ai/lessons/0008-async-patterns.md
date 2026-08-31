---
title: Async Patterns — Python and C#
description: "Why async matters for AI pipelines. Loading models, running inference, and I/O without freezing the main thread."
level: beginner
duration: "5 min"
weight: 8
---

## Why Async?

AI pipelines are **I/O heavy**: loading a 500 MB model from disk, downloading images, waiting for a GPU to finish inference. If you do these synchronously, your program freezes until each operation completes.

Async lets you say: "start this slow thing, and while waiting, do other work." In a game engine, this means the camera keeps rendering at 60 FPS while a model loads in the background.

## Python: asyncio

```python
import asyncio

# Synchronous — blocks everything
def load_model_sync():
    time.sleep(5)  # simulates loading a 500MB model
    return "model loaded"

# Asynchronous — yields control while waiting
async def load_model():
    await asyncio.sleep(5)  # simulates slow I/O — other tasks can run
    return "model loaded"

# Running multiple things concurrently
async def main():
    # Both load "at the same time" — total ~5s, not ~10s
    model_a, model_b = await asyncio.gather(
        load_model(),
        load_model(),
    )

asyncio.run(main())
```

**Key syntax:**
- `async def` declares a coroutine (a function that can be paused/resumed)
- `await` pauses the coroutine until the awaited operation finishes
- `asyncio.gather()` runs multiple coroutines concurrently
- `asyncio.run()` is the entry point — starts the event loop

**The rule:** `await` only works inside `async def`. You can't await in a regular function. This is the same constraint as C#.

### When PyTorch Meets Async

PyTorch operations are **CPU/GPU-bound**, not I/O-bound. `torch.matmul()` doesn't yield — it blocks until the math is done. Async helps with the *surrounding* I/O: loading data from disk, fetching images over HTTP, batching requests.

```python
async def inference_pipeline():
    # I/O — good candidate for async
    image_bytes = await fetch_image("https://example.com/photo.jpg")

    # Compute — runs on GPU, blocks the event loop briefly
    # For production: run in a thread pool to avoid blocking
    result = await asyncio.to_thread(run_model, image_bytes)
    return result
```

`asyncio.to_thread()` offloads blocking work to a thread, keeping the event loop free. This is the pattern you'd use to run PyTorch inference in an async web server.

## C#: async/await

C# has the same concept, different syntax — and it's built into the language more deeply. Every I/O API in .NET has an `Async` suffix.

```csharp
using System.Threading.Tasks;
using UnityEngine;

public class ModelLoader : MonoBehaviour
{
    private string modelPath = "models/sam_v2.onnx";

    async void Start()
    {
        // Load model without freezing the game
        var model = await LoadModelAsync(modelPath);
        Debug.Log("Model ready for inference");
    }

    async Task<Model> LoadModelAsync(string path)
    {
        // ReadAllBytesAsync — the Async suffix means it's non-blocking
        byte[] data = await System.IO.File.ReadAllBytesAsync(path);
        return new Model(data);
    }
}
```

**Unity-specific note:** `async void` is normally forbidden in C# — use `async Task` instead. But Unity's `Start()` and `Update()` return `void`, so `async void` is the only way to make them async. Exceptions in `async void` crash the app silently, so wrap the body in a try/catch.

### Coroutines — Unity's Original Async

Before C# had async/await, Unity invented **Coroutines**. You'll see them everywhere in existing code:

```csharp
IEnumerator LoadModelCoroutine()
{
    var operation = Resources.LoadAsync("models/sam_v2");
    while (!operation.isDone)
    {
        Debug.Log($"Loading: {operation.progress * 100}%");
        yield return null;  // resume next frame
    }
    var model = operation.asset;
}

// Start it
StartCoroutine(LoadModelCoroutine());
```

**In practice:** New code should prefer `async/await`. It composes better (`Task.WhenAll` ≈ `asyncio.gather`) and has proper error handling. But you'll read coroutines in existing Unity projects.

## The Pattern Is the Same

| Concept | Python | C# |
|---------|--------|-----|
| Declare async | `async def` | `async Task<T>` |
| Wait for result | `await expr` | `await expr` |
| Run concurrently | `asyncio.gather()` | `Task.WhenAll()` |
| Offload blocking | `asyncio.to_thread()` | `Task.Run()` |
| Entry point | `asyncio.run()` | `async void Start()` (Unity) |

The syntax maps almost 1:1. The hard part isn't the keywords — it's understanding *when* to use async. Rule of thumb: **if it waits for something external (disk, network, GPU), make it async.** Pure math on CPU stays synchronous.

## Why This Matters for 3D AI

Your prototype will need to:
1. **Load a model** (heavy I/O) — async, or the UI freezes for seconds
2. **Run inference** (GPU compute) — offload to a thread if the main loop can't block
3. **Fetch input data** (camera frames, network images) — naturally async I/O

Getting async right means smooth interaction while heavy AI work happens in the background.

---

**Next:** [Debugging 3D — Why Print Isn't Enough](./0009-debugging-3d.md)
