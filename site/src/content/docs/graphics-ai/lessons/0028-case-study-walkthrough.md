---
title: Case Study Walkthrough
description: How to structure an architecture answer — problem → approach → tradeoffs → result.
level: advanced
duration: "7 min"
weight: 28
---

## The Four-Part Structure

Every architecture case study follows this skeleton:

1. **Problem** — What are we actually building? Re-state it in your own words.
2. **Approach** — What components, tools, and data flow would you use?
3. **Tradeoffs** — What did you choose *not* to do, and why?
4. **Result** — What does success look like? How would you validate it?

Let's walk through an example.

---

## Example: "Segment Objects in a 3D Factory Scan"

### 1. Problem

> "We need a system where an operator can look at a 3D scan of a factory floor, click on a machine, and see just that machine isolated. The input is a set of photos captured by a walk-through camera rig. The output is an interactive 3D view of the selected object."

You've re-stated the problem clearly and grounded it in concrete inputs and outputs.

### 2. Approach

> "Three components. First, reconstruction — COLMAP for Structure-from-Motion to get a point cloud and camera poses from the photos. Second, segmentation — project the operator's click in the 3D view back to a 2D frame, run SAMv2 with that point as a prompt, and get a segmentation mask. Third, projection — project the mask into 3D using the camera parameters to filter the point cloud. The visualization uses Open3D for interactive rendering with raycasting for the click interaction."

Key moves:
- You named specific tools and **why** (COLMAP → proven SfM; SAMv2 → zero-shot).
- You described the data flow end-to-end.
- You kept scope tight — no "and then I'd train a custom model."

### 3. Tradeoffs

This is where depth shows. Someone who only says what they'd do is guessing. Someone who says what they'd do *and what they chose not to do* is deciding.

> "I chose COLMAP over Nerfstudio because the output needs to be a point cloud that I can segment and filter — a NeRF or Gaussian Splat would be harder to interact with at the per-object level. The tradeoff is visual quality: a Gaussian Splat looks better than a point cloud, especially for thin structures. If visual fidelity were the priority, I'd switch to Nerfstudio with Gaussian Splatting and do the segmentation in image space before reconstruction."
>
> "I chose SAMv2 over GroundingDINO because the prompt is a click (spatial), not text (semantic). If the use case were 'find all fire extinguishers,' I'd reach for GroundingDINO instead."
>
> "I chose file-based communication between Python and the visualizer for the prototype. The tradeoff is latency — every segmentation request means writing and reading a file. For production, I'd use a REST API for prompts and memory-mapped files for the point cloud data."

Pattern: **"I chose X over Y because Z. The tradeoff is W. If the priority were Q, I'd choose Y instead."**

### 4. Result

> "Success is: the operator clicks a machine and sees it isolated in under two seconds. I'd validate by testing on a small dataset of 20–30 photos of a scene with known objects and measuring segmentation accuracy — does the isolated cloud match the actual object boundary? I'd also measure end-to-end latency from click to visual update."

A measurable outcome and a validation plan.

---

## Structuring an Explanation

| Time | Section | What to Cover |
|---|---|---|
| 0:00–0:30 | Problem re-statement | What's the input, what's the output |
| 0:30–2:00 | Approach | Components, data flow, tool choices |
| 2:00–3:30 | Tradeoffs | 2–3 specific choices and their alternatives |
| 3:30–4:30 | Result | What success looks like, how you'd validate |
| 4:30–5:00 | Open questions | What you'd investigate with more time |

### The "Open Questions" Bonus

Ending with "What I'd want to investigate" shows honest assessment:

> "With more time, I'd look into multi-view consensus for the mask projection — a point might be visible from five cameras but only masked in three. A voting threshold would make that more robust. I'd also benchmark SAMv2 Small vs Large on the actual factory images — the latency difference might let me use the smaller model without quality loss."

## Anti-Patterns

- **Don't jump to the first tool you know.** Start from the data flow, then pick tools. "I'd use Python" is not an approach — it's a language.
- **Don't describe features, describe decisions.** "SAMv2 can segment anything" is trivia. "I chose SAMv2 because the prompt is spatial, not semantic" is a decision.
- **Don't dodge tradeoffs.** "There are no downsides" means you haven't looked hard enough. Every choice excludes another.
- **Don't go wide.** Three tradeoffs explained clearly beat seven mentioned briefly. Depth signals understanding.

## Practice Exercise

Walk through your prototype using the four-part structure. Ask yourself:

1. Did I re-state the problem in my own words?
2. Did I name specific tools and *why*?
3. Did I discuss at least two tradeoffs with alternatives?
4. Did I define what success looks like?

If any answer is "no," revise that section.

This completes **M6: Prototype & Case Study Prep**. You've covered the full stack: math foundations, PyTorch, modern vision models, 3D reconstruction, architecture decisions, and deployment.
