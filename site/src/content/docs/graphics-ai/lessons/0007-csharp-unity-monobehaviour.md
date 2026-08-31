---
title: C# in Unity — MonoBehaviour Lifecycle
description: "How game engines tick. Awake, Start, Update, and the Transform component that positions everything in 3D."
level: beginner
duration: "5 min"
weight: 7
---

## How Game Engines Tick

A game engine doesn't run your code from top to bottom once. It **calls your code every frame** — 60 times per second at 60 FPS. Your job is to write functions that the engine invokes at the right moment. Unity uses `MonoBehaviour` as the base class for anything that lives in a scene.

Think of it as: the engine is the main loop, your scripts are callbacks.

## The Lifecycle Functions

```csharp
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    // 1. Called once — when the object is created in memory
    // Use for: internal initialization, finding components
    void Awake()
    {
        Debug.Log("Awake — I exist but the scene isn't ready yet");
    }

    // 2. Called once — after ALL objects have run Awake
    // Use for: setup that depends on other objects being initialized
    void Start()
    {
        Debug.Log("Start — scene is ready, let's go");
    }

    // 3. Called every frame — the heartbeat of your game
    // Use for: movement, input, any per-frame logic
    void Update()
    {
        // This runs 60 times per second (or whatever your FPS is)
    }

    // 4. Called at fixed intervals — for physics
    // Use for: Rigidbody forces, physics calculations
    void FixedUpdate()
    {
        // Runs on a fixed timestep (default 0.02s = 50 Hz)
        // Physics stays stable regardless of framerate
    }

    // 5. Called after all Updates — for follow-up logic
    void LateUpdate()
    {
        // Camera follows player here — after the player moved in Update
    }
}
```

**Order matters:** `Awake` → `Start` → `Update` (every frame) → `OnDisable`/`OnDestroy`. If your `Start` references another object's data, that object must have set it up in `Awake`.

## Transform — Where Things Are

Every `MonoBehaviour` is attached to a `GameObject`, and every `GameObject` has a `Transform`. This is the component that stores **position, rotation, and scale** in 3D space. It's the 3D equivalent of an HTML element's position — every single object has one.

```csharp
void Update()
{
    // Position — where in world space
    Vector3 pos = transform.position;           // read
    transform.position = new Vector3(0, 1, 0);  // write: x=0, y=1, z=0

    // Local position — relative to parent (like CSS relative positioning)
    Vector3 localPos = transform.localPosition;

    // Move forward at 5 units/second
    transform.position += transform.forward * 5f * Time.deltaTime;

    // Rotation — as euler angles (degrees) or quaternion
    transform.Rotate(0, 90, 0);                      // yaw 90°
    Quaternion rot = transform.rotation;              // the actual storage

    // Scale
    Vector3 scale = transform.localScale;
}
```

`Time.deltaTime` is the time since last frame. **Always multiply movement by it** — otherwise your speed depends on framerate. At 60 FPS you'd move twice as fast as 30 FPS without it.

## Input Basics

```csharp
void Update()
{
    // Keyboard — true while held
    if (Input.GetKey(KeyCode.W))
    {
        transform.position += transform.forward * 5f * Time.deltaTime;
    }

    // Mouse — 0 = left, 1 = right, 2 = middle
    if (Input.GetMouseButtonDown(0))
    {
        Debug.Log("Clicked at " + Input.mousePosition);
    }

    // New Input System (recommended for production)
    // Uses actions mapped in a .inputactions asset
    // Not covered here — but know it exists
}
```

## Why This Matters for 3D AI

When you bring AI output into a game engine, you need to:
1. **Move objects** based on model predictions → `transform.position = ...` in `Update`
2. **Get camera input** for CV models → camera texture → tensor pipeline
3. **Coordinate timing** — model inference might run async while the game ticks at 60 FPS

The MonoBehaviour lifecycle is the clock that drives everything. Understanding when your code runs (Awake vs Start vs Update) prevents a whole class of null-reference and timing bugs.

**Practice:** Open [Unity Learn — Getting Started with Unity Scripting](https://learn.unity.com/project/getting-started-with-unity-scripting). Complete the "Moving Objects" module. You'll write a script that moves an object with arrow keys — exactly the pattern above.

---

**Next:** [Async Patterns — Python and C#](./0008-async-patterns.md)
