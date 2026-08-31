---
title: Debugging 3D — Why Print Isn't Enough
description: "Spatial bugs need spatial tools. Gizmos, debug drawing, visual logging, and editor inspection for when your 3D code goes wrong."
level: beginner
duration: "5 min"
weight: 9
---

## The Problem

In Python, `print(x)` shows you a value. In 3D, the value is often a **position, direction, or transform** — and seeing `(1.37, 0.0, -2.44)` tells you almost nothing. Is the object above or below ground? Facing the right way? Inside another object?

A 2D text log can't answer spatial questions. You need **visual debugging** — draw the thing you're trying to understand.

## Unity: Gizmos and Debug Drawing

### OnDrawGizmos — Always-Visible Helpers

```csharp
using UnityEngine;

public class PatrolPoint : MonoBehaviour
{
    public Transform[] waypoints;

    // Draws in the Scene view — always visible, even when game is paused
    void OnDrawGizmos()
    {
        // Draw a green sphere at each waypoint
        Gizmos.color = Color.green;
        foreach (var wp in waypoints)
        {
            if (wp != null)
                Gizmos.DrawWireSphere(wp.position, 0.3f);
        }

        // Draw lines connecting waypoints
        Gizmos.color = Color.yellow;
        for (int i = 0; i < waypoints.Length - 1; i++)
        {
            if (waypoints[i] != null && waypoints[i + 1] != null)
                Gizmos.DrawLine(waypoints[i].position, waypoints[i + 1].position);
        }
    }
}
```

Gizmos appear in the **Scene view** (not the Game view). They're your first tool for understanding spatial relationships — patrol paths, detection ranges, spawn points.

### Debug.DrawLine — Runtime Drawing

```csharp
void Update()
{
    // Draw a red ray showing the object's forward direction
    Debug.DrawRay(transform.position, transform.forward * 5f, Color.red);

    // Draw a line between two objects (visible for one frame)
    Debug.DrawLine(transform.position, target.position, Color.cyan);
}
```

`Debug.DrawRay` and `Debug.DrawLine` appear in both Scene and Game views (if Gizmos enabled). They're free — no performance cost in builds since the compiler strips them out.

### Common Patterns

```csharp
// Show a detection radius
Gizmos.DrawWireSphere(transform.position, detectionRadius);

// Show the camera frustum
Gizmos.DrawFrustum(transform.position, fov, farClip, nearClip, aspect);

// Show a raycast hit point
if (Physics.Raycast(origin, direction, out RaycastHit hit, maxDist))
{
    Debug.DrawLine(origin, hit.point, Color.green);  // ray path
    Debug.DrawRay(hit.point, hit.normal, Color.blue); // surface normal
}
```

## Python: Visual Logging

When working with point clouds and 3D data in Python, you have different tools but the same principle — **draw it, don't print it**.

```python
import open3d as o3d
import numpy as np

# Instead of: print(points)  →  unreadable wall of numbers
# Do this: visualize the point cloud

points = np.random.randn(1000, 3)
pcd = o3d.geometry.PointCloud()
pcd.points = o3d.utility.Vector3dVector(points)
o3d.visualization.draw_geometries([pcd], window_name="Debug: raw points")

# Color-code to find outliers (anything > 2 std devs from center)
dists = np.linalg.norm(points, axis=1)
colors = np.where(dists[:, None] > 4.0, [1, 0, 0], [0, 1, 0])  # red=outlier
pcd.colors = o3d.utility.Vector3dVector(colors)
o3d.visualization.draw_geometries([pcd], window_name="Debug: outliers in red")
```

## The Inspector — Your Best Friend

In Unity, the **Inspector window** shows every component's live values while the game runs. If something's in the wrong position:

1. Select the object in the Hierarchy
2. Read `Transform → Position / Rotation / Scale` in the Inspector
3. If values are wrong, trace back where they're being set

This is faster than any `Debug.Log`. You can also **watch variables change in real time** by making them `public` or adding `[SerializeField]`:

```csharp
public class EnemyAI : MonoBehaviour
{
    [SerializeField] private float detectionRange = 10f;  // visible in Inspector
    [SerializeField] private bool hasLineOfSight;          // watch this tick on/off
    [SerializeField] private Vector3 lastKnownPosition;    // track where AI thinks player is
}
```

## Debugging Checklist

When something's wrong in 3D, work through this list before reaching for `print()`:

1. **Inspector** — are the transform values what you expect?
2. **Gizmos** — draw what you're computing (detection radius, ray direction, target position)
3. **Debug.DrawRay/Line** — make rays and connections visible at runtime
4. **Scene view** — switch from Game to Scene view, orbit the camera, look from above
5. **Color coding** — paint outliers, wrong states, or debug values with color
6. **Only then** `Debug.Log` — for values that genuinely can't be visualized (scores, state names)

The Spanish way to remember: *ver es creer* — seeing is believing. If you can't see it, you can't debug it.

## Why This Matters for 3D AI

AI output in 3D is inherently spatial:
- A segmentation mask mapped to a 3D position — is it where you think?
- A detected object's bounding box — does it line up with the 3D mesh?
- A raycast from camera through a landmark — does it hit the right surface?

These are visual questions. Text logs won't answer them. Learning to draw your debug info is the skill that separates someone who can ship from someone who's stuck for hours on "the object isn't where it should be."

**Practice:** In Unity, create a script with `OnDrawGizmos` that draws a circle of small spheres around the object. Change the radius in the Inspector and watch it update live. Then add `Debug.DrawRay(transform.position, transform.forward * 3f, Color.red)` in `Update`.

---

**Next:** [Images as Tensors](./0010-images-as-tensors.md)
