---
title: "Evergine & Plain Concepts Context"
description: "What to research before the interview, smart questions to ask, and how to show a growth mindset without faking expertise."
level: advanced
duration: "5 min"
weight: 29
---

## Know the Company Before You Walk In

Plain Concepts is a Spanish tech company that builds custom software for enterprise clients. They have offices in Spain and work internationally. Their 3D engine, Evergine (formerly Wave Engine), is their differentiation — it's what makes this role "Graphics AI" and not just "ML engineer."

### What to Research

| Topic | Where | What You're Looking For |
|---|---|---|
| Evergine engine features | [evergine.com](https://evergine.com) | What it renders, what platforms it targets, what makes it different from Unity |
| Plain Concepts case studies | [plainconcepts.com](https://www.plainconcepts.com) | Industries they serve, types of 3D/AI projects they've built |
| Evergine GitHub / docs | [github.com/EvergineTeam](https://github.com/EvergineTeam) | Code patterns, architecture, how they structure C# projects |
| The job description itself | Your copy of the posting | Required skills, nice-to-haves, team size, reporting line |

**Don't memorize.** You're building enough context to ask good questions and show you've done your homework.

## Evergine: What You Need to Know

Evergine is a C#-based 3D engine built by Plain Concepts. Key points for the interview:

- **It targets enterprise and industrial 3D**, not games. Think digital twins, factory visualization, medical imaging — not character animation or game physics.
- **It runs on .NET.** Same ecosystem you've worked in. Same C# patterns — dependency injection, async/await, LINQ.
- **It supports multiple graphics backends** (DirectX, Vulkan, OpenGL). This is architectural — they abstract the rendering API, which means you'd write shaders once and deploy across platforms.
- **It's their own product.** Working on Evergine means you'd be contributing to the engine itself, or building applications on top of it for clients. Ask which.

**How to frame your experience:**

> "I've worked in the .NET ecosystem for years — Azure services, C# backends. Evergine's C# foundation means I'm not starting from zero on the language side. The learning curve is the rendering architecture and the domain-specific patterns, and I'm actively building a prototype that uses Open3D and Python for the AI side — I'd be excited to bring that output into Evergine for visualization."

## Smart Questions to Ask

The questions you ask say as much as the answers you give. Good questions are specific, show preparation, and invite the interviewer to teach you something.

### About the Role

- "How much of the work is building on top of Evergine vs. contributing to the engine itself?"
- "What does a typical project look like — is it one client at a time, or do people work across multiple?"
- "How does the team divide work between the AI pipeline and the rendering side? Are those the same people or different roles?"

### About the Tech

- "What 3D formats does Evergine consume most often? I've been working with point clouds in PLY — is that a common input, or do you typically get meshes?"
- "How do you currently handle the bridge between Python-based AI inference and the C# rendering? Is there an established pattern, or is it project-specific?"
- "What GPU hardware do your client deployments typically run on? That would inform model-size decisions in the AI pipeline."

### About Growth

- "What's the biggest learning curve for new people on this team?"
- "Are there opportunities to go deeper on the graphics side — shaders, rendering techniques — or is the focus more on the AI integration?"

## Showing Growth Mindset (Without Faking It)

The job description says they value willingness to learn over experience. Here's how to demonstrate that authentically:

**Do:**
- **Name what you don't know.** "I haven't written HLSL shaders before, but I understand the rendering pipeline conceptually and I'm building a prototype that touches most of the stack."
- **Show your learning path.** "In the last month I've gone from zero 3D experience to building a point cloud segmentation pipeline. Here's what I built and what I'd improve next."
- **Connect your existing skills.** "The deployment piece maps directly to what I've done in Azure — containerizing a model and serving it isn't new, it's just a different model."
- **Be specific about what excites you.** "The thing that drew me to this role is the bridge between AI inference and real-time rendering — that's the hard engineering problem, and it's where I'd want to grow."

**Don't:**
- **Don't fake depth you don't have.** "I'm very experienced with real-time rendering" — when you're not — will fall apart in two questions.
- **Don't apologize for what you don't know.** "I'm sorry I don't know shader programming" turns a gap into a failure. "I haven't done shader programming yet, but it's on my list once I've shipped the prototype" turns it into a plan.
- **Don't over-qualify.** "I only know the basics" undervalues what you do know. State what you've done, let them assess it.

## The Closing Signal

When they ask "Do you have any questions for us?" — that's your last impression. End with something that shows you've imagined yourself in the role:

> "I'm curious about how the team handles the iteration cycle between the AI side and the rendering side. In my prototype, I found that the communication pattern between Python and the visualizer was where most of the engineering complexity lived — not the model inference itself. Is that consistent with your experience here?"

That question says: I've built something, I've encountered a real problem, and I'm interested in how experienced people solve it. That's the mindset they're hiring for.

## You're Ready

You've spent weeks building intuition for math, PyTorch, vision models, 3D reconstruction, and architecture decisions. You have a prototype. You can explain it in five minutes with tradeoffs. You know the company and the engine.

The interview isn't a test of whether you know everything. It's a test of whether you can learn, reason, and build. You've demonstrated all three by getting here.

Go get it.

---

This completes **M5: 3D AI & Interview Prep**. You've covered the full stack: math foundations, PyTorch, modern vision models, 3D reconstruction, architecture decisions, and how to walk into the interview with confidence.
