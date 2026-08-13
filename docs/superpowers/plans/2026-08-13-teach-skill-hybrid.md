# Teach Skill Hybrid Learning System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Matt Pocock's `/teach` skill as a local interactive teaching workspace alongside the existing Starlight course, then enrich the published Starlight site with quiz components, reference pages, and a glossary.

**Architecture:** Two independent systems in one repo. `teaching/` is the agent-driven workspace where lessons, learning records, and reference docs live. `site/` is the existing Starlight course, enriched with interactive quiz components, reference pages, and a glossary pulled from the teach-skill philosophy. The teach skill reads Starlight content as its knowledge source; the Starlight site gains the teaching patterns as first-class components.

**Tech Stack:** Astro 7, Starlight 0.41, React (for Quiz component), HTML/CSS (for lessons), omp managed-skills

**Spec:** `docs/superpowers/specs/2026-08-13-teach-skill-hybrid-design.md`

## Global Constraints

- Nothing in `teaching/` affects the Starlight build
- Existing Starlight content pages are not modified — only additions (new pages, components, CSS)
- Existing site CSS variables (dark palette in `site/src/custom.css`) must be reused by new components
- Quiz answers must be equal length per teach-skill philosophy
- Reference pages are compressed summaries, not copies of course modules
- Starlight version is 0.41.3, Astro 7 — use compatible APIs only

---

### Task 1: Install Teach Skill as Omp Managed-Skill

**Files:**
- Create: `~/.omp/agent/managed-skills/teach/SKILL.md`

**Interfaces:**
- Consumes: Matt Pocock's teach skill source from `https://raw.githubusercontent.com/mattpocock/skills/main/skills/productivity/teach/SKILL.md`
- Produces: `/teach` command available in omp sessions

- [ ] **Step 1: Create the managed skill**

Use `manage_skill` to create the skill. The body is the teach skill SKILL.md content adapted for omp — remove Claude-Code-specific frontmatter (`disable-model-invocation: true`, `argument-hint`), keep all philosophy, workspace structure, format references, lesson design, ZPD, and asset reuse rules. Change workspace path references from "current directory" to "the `teaching/` directory in the repo root". Add a note that the agent should read existing Starlight content in `site/src/content/docs/` as primary knowledge source.

- [ ] **Step 2: Verify skill is available**

Run: `ls ~/.omp/agent/managed-skills/teach/SKILL.md`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
cd /Users/ima/ws/learning
git add -f ~/.omp/agent/managed-skills/teach/SKILL.md
```

Note: managed-skills live outside the repo, so no repo commit needed — this is a local agent config.

---

### Task 2: Create Teaching Workspace Directory and Core Files

**Files:**
- Create: `teaching/MISSION.md`
- Create: `teaching/NOTES.md`
- Create: `teaching/GLOSSARY.md`
- Create: `teaching/RESOURCES.md` (empty stub — filled in Task 3)
- Create: `teaching/learning-records/.gitkeep`
- Create: `teaching/lessons/.gitkeep`
- Create: `teaching/reference/.gitkeep`
- Create: `teaching/assets/.gitkeep`

**Interfaces:**
- Consumes: nothing
- Produces: `teaching/` workspace that the teach skill and all later tasks reference

- [ ] **Step 1: Create directory structure**

```bash
cd /Users/ima/ws/learning
mkdir -p teaching/learning-records teaching/lessons teaching/reference teaching/assets
touch teaching/learning-records/.gitkeep teaching/lessons/.gitkeep teaching/reference/.gitkeep teaching/assets/.gitkeep
```

- [ ] **Step 2: Write MISSION.md**

```md
# Mission: Backend Engineering

## Why
Land a backend engineering role by building production-grade Java/Spring Boot
applications. The course content covers the stack from Java foundations through
Kafka, GraphQL, and TDD — the goal is employability, not just exposure.

## Success looks like
- Build a Spring Boot microservice from scratch with DI, repos, and services
- Design and implement a Kafka-based event-driven flow
- Write a GraphQL API with proper error handling
- Apply TDD to ship tested, maintainable code
- Explain architectural decisions in interview settings

## Constraints
- Self-directed study alongside other commitments
- Learning from the existing course material as primary source

## Out of scope
- Frontend development
- DevOps / infrastructure beyond basic deployment
- Languages other than Java/Kotlin
```

- [ ] **Step 3: Write NOTES.md**

```md
# Notes

## Preferences

(Recorded as the agent learns about the user's learning style and preferences.)

## Working Notes

(Scratchpad for the teaching agent.)
```

- [ ] **Step 4: Write GLOSSARY.md starter**

```md
# Backend Engineering Glossary

Terminology for this teaching workspace. Terms added only after the learner
demonstrates understanding. All lessons and reference docs use these terms.

## Spring Core

(Will be populated as concepts are mastered.)

## Data & Messaging

(Will be populated as concepts are mastered.)

## Testing

(Will be populated as concepts are mastered.)
```

- [ ] **Step 5: Write RESOURCES.md stub**

```md
# Resources

(To be populated in Task 3.)
```

- [ ] **Step 6: Commit**

```bash
git add teaching/
git commit -m "feat: add teaching workspace with MISSION, GLOSSARY, NOTES"
```

---

### Task 3: Create RESOURCES.md with Curated Sources

**Files:**
- Modify: `teaching/RESOURCES.md`

**Interfaces:**
- Consumes: course module topics from `astro.config.mjs` sidebar (modules 00–11)
- Produces: `RESOURCES.md` with curated external sources the teach skill references

- [ ] **Step 1: Write RESOURCES.md**

```md
# Resources

High-quality, high-trust sources for grounding lessons in real knowledge.
Never trust parametric knowledge — cite these.

## Java Foundations (Module 00)

- **Oracle Java Tutorials** — Type: docs — https://docs.oracle.com/javase/tutorial/ — Trust: official — The canonical Java language reference.
- **Baeldung Java Core** — Type: articles — https://www.baeldung.com/java-tutorial — Trust: high — Practical, well-edited Java guides with code examples.
- **Java 21 Documentation** — Type: docs — https://docs.oracle.com/en/java/javase/21/ — Trust: official — API docs and language spec.

## Build Tools (Module 01)

- **Maven Getting Started** — Type: docs — https://maven.apache.org/guides/getting-started/ — Trust: official — Maven lifecycle, POM, plugins.
- **Spring Initializr** — Type: tool — https://start.spring.io/ — Trust: official — Bootstrapping Spring Boot projects.
- **Gradle User Manual** — Type: docs — https://docs.gradle.org/current/userguide/userguide.html — Trust: official — Gradle DSL, multi-module, dependency management.

## Dependency Injection (Module 02)

- **Spring IoC Container** — Type: docs — https://docs.spring.io/spring-framework/reference/core/beans.html — Trust: official — Bean lifecycle, scopes, autowiring.
- **Baeldung Spring DI** — Type: articles — https://www.baeldung.com/spring-dependency-injection — Trust: high — DI patterns with Spring examples.

## Spring Boot Fundamentals (Module 03)

- **Spring Boot Reference** — Type: docs — https://docs.spring.io/spring-boot/reference/ — Trust: official — Auto-configuration, starters, actuator, properties.
- **Spring Boot Guides** — Type: tutorials — https://spring.io/guides?topic=boot — Trust: official — Step-by-step Spring Boot tutorials.

## Repository Pattern (Module 04)

- **Spring Data JPA Reference** — Type: docs — https://docs.spring.io/spring-data/jpa/reference/ — Trust: official — Repository abstractions, query derivation, transactions.
- **Baeldung Spring Data JPA** — Type: articles — https://www.baeldung.com/the-persistence-layer-with-spring-data-jpa — Trust: high — Practical JPA repository patterns.

## Service Oriented Architecture (Module 05)

- **Spring REST Controller** — Type: docs — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html — Trust: official — REST endpoint design.
- **Martin Fowler — POEAA** — Type: book — https://martinfowler.com/books/eaa.html — Trust: canonical — Layered architecture, service patterns.

## Kafka (Module 06)

- **Apache Kafka Documentation** — Type: docs — https://kafka.apache.org/documentation/ — Trust: official — Producer, consumer, topics, partitions.
- **Confluent Kafka Tutorials** — Type: tutorials — https://developer.confluent.io/tutorials/ — Trust: high — Practical Kafka patterns with code.
- **Spring Kafka Reference** — Type: docs — https://docs.spring.io/spring-kafka/reference/ — Trust: official — Spring integration with Kafka.

## GraphQL (Module 07)

- **GraphQL Spec** — Type: spec — https://spec.graphql.org/ — Trust: official — The language specification.
- **Spring for GraphQL** — Type: docs — https://docs.spring.io/spring-graphql/reference/ — Trust: official — Schema, resolvers, error handling.
- **GraphQL.org Learn** — Type: tutorials — https://graphql.org/learn/ — Trust: high — Schema-first GraphQL fundamentals.

## Reactor Pattern (Module 08)

- **Project Reactor Reference** — Type: docs — https://projectreactor.io/docs/core/release/reference/ — Trust: official — Mono, Flux, operators, backpressure.
- **Reactive Streams Spec** — Type: spec — https://www.reactive-streams.org/ — Trust: official — The reactive streams contract.

## TDD (Module 09)

- **JUnit 5 User Guide** — Type: docs — https://junit.org/junit5/docs/current/user-guide/ — Trust: official — JUnit 5 annotations, extensions, assertions.
- **AssertJ Documentation** — Type: docs — https://assertj.github.io/doc/ — Trust: official — Fluent assertion library.
- **Mockito Documentation** — Type: docs — https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html — Trust: official — Mock creation and stubbing.
- **Spring Boot Testing** — Type: docs — https://docs.spring.io/spring-boot/reference/testing.html — Trust: official — Test slices, @MockBean, test containers.

## Capstone & Kotlin (Modules 10–11)

- **Kotlin Reference** — Type: docs — https://kotlinlang.org/docs/home.html — Trust: official — Data classes, coroutines, null safety.
- **Spring Boot Kotlin** — Type: guides — https://spring.io/guides/tutorials/spring-boot-kotlin/ — Trust: official — Building Spring Boot apps in Kotlin.

## Communities

- **r/java** — Type: forum — https://reddit.com/r/java — Trust: medium — Java ecosystem discussion.
- **r/springboot** — Type: forum — https://reddit.com/r/springboot — Trust: medium — Spring Boot specific Q&A.
- **Stack Overflow [spring-boot]** — Type: forum — https://stackoverflow.com/questions/tagged/spring-boot — Trust: high — Focused Q&A.
```

- [ ] **Step 2: Commit**

```bash
git add teaching/RESOURCES.md
git commit -m "feat: add curated RESOURCES.md for teach workspace"
```

---

### Task 4: Create Shared Stylesheet for Lessons

**Files:**
- Create: `teaching/assets/base.css`

**Interfaces:**
- Consumes: nothing
- Produces: `teaching/assets/base.css` — linked by all lesson HTML files; also used as reference in Task 7 for Starlight CSS

- [ ] **Step 1: Write base.css**

Tufte-inspired: serif body, generous margins, sidenote margin, clean code blocks, print-friendly. Dark mode defaults matching the Starlight site palette.

```css
/* teaching/assets/base.css — Shared stylesheet for all lessons */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f172a;
  --bg-surface: #1e293b;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --accent: #818cf8;
  --accent-low: #4f46e5;
  --accent-high: #a5b4fc;
  --border: #334155;
  --correct: #22c55e;
  --wrong: #ef4444;
  --font-body: 'Georgia', 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}

body {
  font-family: var(--font-body);
  font-size: 1.1rem;
  line-height: 1.75;
  color: var(--text);
  background: var(--bg);
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

h1, h2, h3 { font-family: var(--font-body); color: var(--accent-high); }
h1 { font-size: 1.75rem; margin-bottom: 1rem; }
h2 { font-size: 1.35rem; margin-top: 2rem; margin-bottom: 0.75rem; }
h3 { font-size: 1.15rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }

p { margin-bottom: 1rem; }

a { color: var(--accent); text-decoration: underline; }
a:hover { color: var(--accent-high); }

code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--border);
  padding: 0.15em 0.4em;
  border-radius: 4px;
}

pre {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

pre code { background: none; padding: 0; }

blockquote {
  border-left: 3px solid var(--accent);
  margin: 1rem 0 1rem 1rem;
  padding: 0.5rem 1rem;
  color: var(--text-muted);
  font-style: italic;
}

/* Quiz styling */
.quiz { margin: 1.5rem 0; }
.quiz-question { font-weight: 600; margin-bottom: 0.75rem; }
.quiz-options { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.quiz-option {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  font-family: var(--font-mono);
  font-size: 0.95rem;
}
.quiz-option:hover { border-color: var(--accent); }
.quiz-option.selected { border-color: var(--accent); background: var(--accent-low); }
.quiz-option.correct { border-color: var(--correct); background: rgba(34, 197, 94, 0.15); }
.quiz-option.wrong { border-color: var(--wrong); background: rgba(239, 68, 68, 0.15); }
.quiz-feedback { margin-top: 0.75rem; font-weight: 600; }

/* Lesson footer */
.lesson-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* Print */
@media print {
  body { background: white; color: black; max-width: 100%; }
  a { color: #333; }
  pre { border: 1px solid #ccc; }
}
```

- [ ] **Step 2: Commit**

```bash
git add teaching/assets/base.css
git commit -m "feat: add shared Tufte-inspired stylesheet for teach lessons"
```

---

### Task 5: Create First Lesson

**Files:**
- Create: `teaching/lessons/0001-what-is-dependency-injection.html`

**Interfaces:**
- Consumes: `teaching/assets/base.css` (linked), `site/src/content/docs/02-dependency-injection.md` (knowledge source), `teaching/RESOURCES.md` (citations)
- Produces: first lesson HTML — the agent uses this pattern for all future lessons

- [ ] **Step 1: Write the lesson**

A lesson on "What is Dependency Injection?" — drawn from Module 02. Contains:
- Knowledge section: concise explanation of DI, IoC container, @Autowired
- Interactive quiz: 3 questions with equal-length answers
- Primary source link
- Followup reminder
- Link to base.css

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lesson 1 — What is Dependency Injection?</title>
  <link rel="stylesheet" href="../assets/base.css">
</head>
<body>

<h1>What is Dependency Injection?</h1>

<p>Dependency Injection (DI) is a pattern where objects receive their
collaborators from an external container rather than creating them directly.
Instead of a service calling <code>new RepositoryImpl()</code>, the Spring IoC
container wires the dependency at runtime.</p>

<h2>Why it matters</h2>

<p>DI decouples construction from usage. A class declares what it needs (via
constructor parameters or <code>@Autowired</code>), and the container supplies
it. This makes code testable (swap in mocks), modular (swap implementations),
and explicit (dependencies are visible in the constructor).</p>

<h2>The Spring IoC Container</h2>

<p>Spring's <strong>Inversion of Control (IoC) container</strong> manages
objects called <strong>beans</strong>. A bean is a Java object whose lifecycle
is controlled by Spring. The container:</p>

<ul>
  <li>Creates beans from your <code>@Component</code>, <code>@Service</code>,
      <code>@Repository</code> classes</li>
  <li>Resolves their dependencies</li>
  <li>Injects them where needed</li>
</ul>

<pre><code>@Service
public class OrderService {
    private final OrderRepository repo;

    public OrderService(OrderRepository repo) {
        this.repo = repo; // Spring injects this
    }
}</code></pre>

<p><strong>Constructor injection</strong> is the recommended form — it makes
the dependency immutable and required. Field injection (<code>@Autowired</code>
on a field) exists but is discouraged because it hides dependencies and makes
testing harder.</p>

<h2>Check your understanding</h2>

<div class="quiz" id="q1">
  <div class="quiz-question">1. What does DI stand for in the Spring context?</div>
  <ul class="quiz-options">
    <li class="quiz-option" data-correct="true">Dependency Injection</li>
    <li class="quiz-option">Direct Invocation</li>
    <li class="quiz-option">Data Instance</li>
  </ul>
  <div class="quiz-feedback"></div>
</div>

<div class="quiz" id="q2">
  <div class="quiz-question">2. Which injection style does Spring recommend?</div>
  <ul class="quiz-options">
    <li class="quiz-option" data-correct="true">Constructor injection</li>
    <li class="quiz-option">Field injection</li>
    <li class="quiz-option">Setter injection</li>
  </ul>
  <div class="quiz-feedback"></div>
</div>

<div class="quiz" id="q3">
  <div class="quiz-question">3. What manages bean lifecycles in Spring?</div>
  <ul class="quiz-options">
    <li class="quiz-option" data-correct="true">IoC container</li>
    <li class="quiz-option">JVM classloader</li>
    <li class="quiz-option">Maven surefire</li>
  </ul>
  <div class="quiz-feedback"></div>
</div>

<div class="lesson-footer">
  <p><strong>Primary source:</strong> <a href="https://docs.spring.io/spring-framework/reference/core/beans.html" target="_blank">Spring IoC Container Reference</a></p>
  <p><strong>Course material:</strong> <a href="../../site/src/content/docs/02-dependency-injection.md">Module 02 — Dependency Injection</a></p>
  <p>Questions? Ask the teaching agent — it can explain anything unclear.</p>
</div>

<script>
document.querySelectorAll('.quiz').forEach(quiz => {
  const options = quiz.querySelectorAll('.quiz-option');
  const feedback = quiz.querySelector('.quiz-feedback');
  let answered = false;

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const isCorrect = opt.dataset.correct === 'true';
      opt.classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) {
        options.forEach(o => {
          if (o.dataset.correct === 'true') o.classList.add('correct');
        });
      }
      feedback.textContent = isCorrect ? '✓ Correct!' : '✗ Not quite — see the correct answer highlighted.';
      feedback.style.color = isCorrect ? 'var(--correct)' : 'var(--wrong)';
    });
  });
});
</script>

</body>
</html>
```

- [ ] **Step 2: Open the lesson in the browser to verify rendering**

```bash
open /Users/ima/ws/learning/teaching/lessons/0001-what-is-dependency-injection.html
```

Expected: lesson renders with dark background, serif text, clickable quiz with instant feedback.

- [ ] **Step 3: Commit**

```bash
git add teaching/lessons/
git commit -m "feat: add first lesson — What is Dependency Injection?"
```

---

### Task 6: Merge Lesson Styles into Starlight Custom CSS

**Files:**
- Modify: `site/src/custom.css`

**Interfaces:**
- Consumes: quiz/lesson CSS patterns from `teaching/assets/base.css`
- Produces: quiz component styles available in the Starlight site (used by Quiz component in Task 7)

- [ ] **Step 1: Append quiz and lesson styles to custom.css**

After the existing `.module-desc` rule (line 95), add:

```css
/* ---- Quiz component (from teach-skill patterns) ---- */
.sl-markdown-content .quiz { margin: 1.5rem 0; }
.sl-markdown-content .quiz-question { font-weight: 600; margin-bottom: 0.75rem; color: var(--sl-color-white); }
.sl-markdown-content .quiz-options { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.sl-markdown-content .quiz-option {
  background: var(--sl-color-gray-6);
  border: 1px solid var(--sl-color-gray-5);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  font-family: var(--sl-font-mono);
  font-size: 0.95rem;
  color: var(--sl-color-text);
}
.sl-markdown-content .quiz-option:hover { border-color: var(--sl-color-accent); }
.sl-markdown-content .quiz-option.selected { border-color: var(--sl-color-accent); background: var(--sl-color-accent-low); }
.sl-markdown-content .quiz-option.correct { border-color: #22c55e; background: rgba(34, 197, 94, 0.15); }
.sl-markdown-content .quiz-option.wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.15); }
.sl-markdown-content .quiz-feedback { margin-top: 0.75rem; font-weight: 600; }
```

- [ ] **Step 2: Commit**

```bash
git add site/src/custom.css
git commit -m "feat: add quiz component styles to Starlight custom CSS"
```

---

### Task 7: Create Quiz React Component for Starlight

**Files:**
- Create: `site/src/components/Quiz.jsx`

**Interfaces:**
- Consumes: CSS classes from `site/src/custom.css` (`.quiz`, `.quiz-question`, etc.)
- Produces: `<Quiz>` React component usable in `.mdx` content files

- [ ] **Step 1: Write Quiz.jsx**

A self-contained React component. Takes `question`, `options` (array of strings), and `correctIndex` (0-based). Renders equal-length answer buttons with click-to-reveal feedback.

```jsx
import { useState } from 'react';

export default function Quiz({ question, options, correctIndex }) {
  const [selected, setSelected] = useState(null);

  const handleClick = (index) => {
    if (selected !== null) return;
    setSelected(index);
  };

  return (
    <div className="quiz">
      <div className="quiz-question">{question}</div>
      <ul className="quiz-options">
        {options.map((option, index) => {
          let className = 'quiz-option';
          if (selected !== null) {
            if (index === correctIndex) className += ' correct';
            else if (index === selected) className += ' wrong';
          }
          return (
            <li
              key={index}
              className={className}
              onClick={() => handleClick(index)}
            >
              {option}
            </li>
          );
        })}
      </ul>
      {selected !== null && (
        <div className="quiz-feedback">
          {selected === correctIndex ? '✓ Correct!' : '✗ Not quite — correct answer highlighted.'}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add site/src/components/Quiz.jsx
git commit -m "feat: add interactive Quiz React component for Starlight"
```

---

### Task 8: Create Reference Pages in Starlight

**Files:**
- Create: `site/src/content/docs/reference/index.md`
- Create: `site/src/content/docs/reference/spring-annotations.md`
- Create: `site/src/content/docs/reference/maven-cheatsheet.md`
- Create: `site/src/content/docs/reference/kafka-api.md`

**Interfaces:**
- Consumes: course content from existing modules (compressed summaries)
- Produces: reference pages linked from the sidebar

- [ ] **Step 1: Write reference/index.md**

```md
---
title: Reference
description: Quick-reference cheat sheets for key backend engineering tools and patterns.
---

Quick-reference pages you can come back to during development or interview prep.
These are compressed summaries — for full explanations, see the corresponding course module.

- [Spring Annotations](./spring-annotations/) — Common Spring annotations and what they do
- [Maven Cheatsheet](./maven-cheatsheet/) — Lifecycle, phases, plugins, POM essentials
- [Kafka API](./kafka-api/) — Producer, Consumer, Streams API quick reference
```

- [ ] **Step 2: Write reference/spring-annotations.md**

```md
---
title: Spring Annotations
description: Quick reference for the most common Spring annotations.
---

## Stereotype Annotations

| Annotation | Purpose | Typical Layer |
|---|---|---|
| `@Component` | Generic Spring bean | Any |
| `@Service` | Business logic bean | Service layer |
| `@Repository` | Data access bean (enables exception translation) | Repository layer |
| `@Controller` | Web MVC controller | Web layer |
| `@RestController` | `@Controller` + `@ResponseBody` | REST API layer |
| `@Configuration` | Bean definition class | Config |

## Dependency Injection

| Annotation | Purpose | Recommended? |
|---|---|---|
| Constructor parameter | Implicit injection of required dependency | ✅ Yes |
| `@Autowired` | Explicit injection on field/setter/constructor | ⚠️ Constructor only |
| `@Qualifier("name")` | Disambiguate when multiple beans match | Yes, when needed |
| `@Primary` | Default bean when multiple candidates exist | When only one should be default |

## Web & REST

| Annotation | Purpose |
|---|---|
| `@GetMapping` | Handle HTTP GET |
| `@PostMapping` | Handle HTTP POST |
| `@PutMapping` | Handle HTTP PUT |
| `@DeleteMapping` | Handle HTTP DELETE |
| `@PatchMapping` | Handle HTTP PATCH |
| `@RequestMapping` | Base mapping (class or method level) |
| `@PathVariable` | Extract URL segment |
| `@RequestParam` | Extract query parameter |
| `@RequestBody` | Deserialize JSON body |
| `@ResponseBody` | Serialize return value as JSON |

## Data & JPA

| Annotation | Purpose |
|---|---|
| `@Entity` | JPA entity class |
| `@Id` | Primary key field |
| `@GeneratedValue` | Auto-generate primary key |
| `@Column` | Map field to column (customize name, nullable, etc.) |
| `@OneToMany` / `@ManyToOne` | Relationship mapping |
| `@Transactional` | Wrap method in a database transaction |

## Configuration & Lifecycle

| Annotation | Purpose |
|---|---|
| `@Value("${prop}")` | Inject property from application.yml |
| `@ConfigurationProperties` | Type-safe property binding |
| `@Profile("name")` | Activate bean only in given profile |
| `@PostConstruct` | Run after dependency injection |
| `@PreDestroy` | Run before bean removal |
| `@Bean` | Declare a bean in a `@Configuration` class |
| `@Scope` | Change bean scope (singleton, prototype, etc.) |
```

- [ ] **Step 3: Write reference/maven-cheatsheet.md**

```md
---
title: Maven Cheatsheet
description: Quick reference for Maven lifecycle, phases, plugins, and POM structure.
---

## Build Lifecycle

Maven has three built-in lifecycles: **default** (build), **clean** (remove output), **site** (documentation).

### Default Lifecycle — Key Phases

| Phase | What happens |
|---|---|
| `validate` | Check project structure is correct |
| `compile` | Compile source code |
| `test` | Run unit tests |
| `package` | Package compiled code (JAR, WAR) |
| `verify` | Run integration checks |
| `install` | Install package to local repo (`~/.m2/repository`) |
| `deploy` | Copy package to remote repo |

Phases execute sequentially — `mvn package` runs everything up through `package`.

## Common Commands

| Command | Effect |
|---|---|
| `mvn clean install` | Full rebuild + install to local repo |
| `mvn compile` | Compile only |
| `mvn test` | Run tests |
| `mvn package -DskipTests` | Package without running tests |
| `mvn dependency:tree` | Show full dependency tree |
| `mvn versions:display-dependency-updates` | Check for newer dependency versions |

## POM Essentials

```xml
<project>
  <groupId>com.example</groupId>      <!-- Organization -->
  <artifactId>order-service</artifactId> <!-- Project name -->
  <version>1.0.0</version>             <!-- Semantic version -->

  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
  </parent>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>
</project>
```

## Multi-Module

```xml
<modules>
  <module>core</module>
  <module>api</module>
  <module>infrastructure</module>
</modules>
```

Each `<module>` points to a child directory with its own `pom.xml`.
The parent POM declares shared dependencies in `<dependencyManagement>`.
```

- [ ] **Step 4: Write reference/kafka-api.md**

```md
---
title: Kafka API Quick Reference
description: Producer, Consumer, and Streams API essentials.
---

## Core Concepts

| Term | Definition |
|---|---|
| **Topic** | Named log that stores messages in order |
| **Partition** | Ordered subset of a topic; unit of parallelism |
| **Offset** | Unique sequential ID of a message within a partition |
| **Consumer Group** | Set of consumers that share partitions of a topic |
| **Key** | Optional message attribute; determines partition assignment |

## Producer API

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", StringSerializer.class.getName());
props.put("value.serializer", StringSerializer.class.getName());

try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
    ProducerRecord<String, String> record =
        new ProducerRecord<>("orders", "order-1", "{\"item\": \"widget\"}");
    producer.send(record, (metadata, exception) -> {
        if (exception == null) {
            System.out.println("Offset: " + metadata.offset());
        }
    });
}
```

| Config | Purpose |
|---|---|
| `acks=all` | Wait for all in-sync replicas to confirm |
| `retries=3` | Retry on transient failure |
| `enable.idempotence=true` | Prevent duplicates on retry |

## Consumer API

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "order-processor");
props.put("key.deserializer", StringDeserializer.class.getName());
props.put("value.deserializer", StringDeserializer.class.getName());
props.put("auto.offset.reset", "earliest");

try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
    consumer.subscribe(List.of("orders"));
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
        records.forEach(record ->
            System.out.println(record.key() + ": " + record.value()));
    }
}
```

| Config | Purpose |
|---|---|
| `group.id` | Consumer group identifier |
| `auto.offset.reset=earliest` | Read from beginning if no committed offset |
| `enable.auto.commit=false` | Manual offset commit (recommended for exactly-once) |

## Spring Kafka

```java
@KafkaListener(topics = "orders", groupId = "order-processor")
public void handleOrder(ConsumerRecord<String, String> record) {
    // process record
}
```

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: order-processor
      auto-offset-reset: earliest
```
```

- [ ] **Step 5: Commit**

```bash
git add site/src/content/docs/reference/
git commit -m "feat: add reference pages — Spring annotations, Maven, Kafka"
```

---

### Task 9: Create Glossary Page in Starlight

**Files:**
- Create: `site/src/content/docs/reference/glossary.mdx`

**Interfaces:**
- Consumes: terminology from course content
- Produces: published glossary page linked from sidebar; mirrors `teaching/GLOSSARY.md` format

- [ ] **Step 1: Write glossary.mdx**

Uses the Quiz component to make it interactive — user can self-test on term definitions.

```mdx
---
title: Glossary
description: Key backend engineering terms and their definitions.
---

import Quiz from '../../components/Quiz.jsx';

Opinionated definitions for this course. When several words exist for the same concept, we use one and list the rest as aliases.

## Spring Core

**Bean**
: A Java object whose lifecycle is managed by the Spring IoC container. Created from classes annotated with `@Component`, `@Service`, `@Repository`, or declared via `@Bean`.

**IoC Container**
: The Spring runtime that instantiates, configures, and wires beans together. Short for Inversion of Control — the container controls object creation, not the objects themselves.

**Dependency Injection (DI)**
: A pattern where objects receive their collaborators from an external container rather than creating them directly. _Avoid: "passing dependencies", "wiring"_

**Autowiring**
: Spring's mechanism for automatically resolving bean dependencies by type, name, or qualifier. _Avoid: "auto-injection"_

**Application Context**
: The Spring IoC container instance for a Spring Boot application. Provides bean lookup, event propagation, and resource loading.

## Data & Persistence

**JPA (Java Persistence API)**
: The standard Java specification for object-relational mapping. Spring Data JPA implements it. _Avoid: "Hibernate" (that's one implementation)_

**Repository**
: A Spring Data abstraction over data access. Extend `JpaRepository<T, ID>` to get CRUD + query methods with no implementation code.

**Entity**
: A JPA-annotated Java class mapped to a database table. Must have `@Entity` and `@Id`.

**Transaction**
: A unit of work that succeeds or fails atomically. Mark with `@Transactional`.

## Messaging

**Topic**
: A named log in Kafka that stores messages in append-only order. Split into partitions for parallelism.

**Partition**
: An ordered, immutable sequence of messages within a topic. The unit of parallelism and ordering guarantee in Kafka.

**Consumer Group**
: A set of consumers that cooperatively read a topic — each partition is assigned to exactly one consumer in the group.

**Offset**
: The sequential position of a message within a partition. Consumers track their position by committing offsets.

## Testing

**Unit Test**
: A test that verifies one small piece of logic in isolation, with dependencies replaced by test doubles. _Avoid: "micro test"_

**Integration Test**
: A test that verifies multiple components working together, often with a real or embedded database/message broker.

**Test Double**
: A stand-in for a real dependency in a test. Includes mocks, stubs, spies, and fakes. _Avoid: using "mock" as a catch-all_

**Mock**
: A test double that verifies interactions (was this method called?). Use Mockito. _Avoid: using "mock" for any test double_

## Reactive

**Mono**
: A reactive type that emits 0 or 1 item. From Project Reactor. _Avoid: "single observable"_

**Flux**
: A reactive type that emits 0 to N items. From Project Reactor. _Avoid: "stream observable"_

**Backpressure**
: A mechanism for consumers to signal producers they are overwhelmed, controlling the data flow rate.

---

## Test Yourself

<Quiz question="What manages bean lifecycles in Spring?" options={["IoC container", "JVM classloader", "Maven surefire"]} correctIndex={0} />

<Quiz question="A JPA-annotated class mapped to a database table is called what?" options={["An entity", "A record", "A transfer"]} correctIndex={0} />

<Quiz question="What reactive type emits 0 to N items?" options={["Flux", "Mono", "Stream"]} correctIndex={0} />
```

- [ ] **Step 2: Commit**

```bash
git add site/src/content/docs/reference/glossary.mdx
git commit -m "feat: add interactive glossary page with quiz components"
```

---

### Task 10: Update Astro Config Sidebar

**Files:**
- Modify: `site/astro.config.mjs`

**Interfaces:**
- Consumes: reference page slugs created in Tasks 8–9
- Produces: visible Reference section in the Starlight sidebar

- [ ] **Step 1: Add Reference sidebar group**

After the existing `11 — Migrating Java to Kotlin` entry (line 73), add:

```js
        {
          label: 'Reference',
          items: [
            { label: 'Overview', slug: 'reference' },
            { label: 'Spring Annotations', slug: 'reference/spring-annotations' },
            { label: 'Maven Cheatsheet', slug: 'reference/maven-cheatsheet' },
            { label: 'Kafka API', slug: 'reference/kafka-api' },
            { label: 'Glossary', slug: 'reference/glossary' },
          ],
        },
```

- [ ] **Step 2: Commit**

```bash
git add site/astro.config.mjs
git commit -m "feat: add Reference section to Starlight sidebar"
```

---

### Task 11: Build and Verify

**Files:**
- No new files — verification only

**Interfaces:**
- Consumes: all changes from Tasks 6–10
- Produces: verified working Starlight site + teaching workspace

- [ ] **Step 1: Build the Starlight site**

```bash
cd /Users/ima/ws/learning/site && npm run build
```

Expected: build succeeds without errors. Reference pages and glossary are included.

- [ ] **Step 2: Start dev server and visually verify**

```bash
cd /Users/ima/ws/learning/site && npm run dev
```

Open browser, check:
- Reference section appears in sidebar
- Spring Annotations, Maven, Kafka reference pages render
- Glossary page renders with interactive quiz components
- Quiz clicks produce correct/wrong feedback
- Existing course pages unchanged

- [ ] **Step 3: Open local lesson HTML and verify**

```bash
open /Users/ima/ws/learning/teaching/lessons/0001-what-is-dependency-injection.html
```

Expected: lesson renders with dark Tufte-style layout, clickable quiz with instant feedback.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: any build/verification fixes"
```
