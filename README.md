# Backend Engineering Course

Self-directed Java and Spring Boot curriculum. Starts from language fundamentals, ends with a production-grade event-driven order management system.

## Curriculum

12 modules, 62 lessons, 5 quizzes per lesson.

| Module | Topic |
|---|---|
| 00 | Java Foundations: records, generics, streams, pattern matching, OOP |
| 01 | Build Tools: Maven, project structure, profiles |
| 02 | Dependency Injection: IoC, constructor injection, bean scopes, lifecycle |
| 03 | Spring Boot Fundamentals: controllers, request/response, validation |
| 04 | Repository Pattern: JPA, Hibernate, Spring Data, custom queries |
| 05 | Architecture: layered design, service layer, DTOs, anti-patterns |
| 06 | Kafka: producers, consumers, serialization, delivery semantics |
| 07 | GraphQL: schema, resolvers, N+1, DataLoader, error handling |
| 08 | Reactive Programming: Reactor, Mono/Flux, WebFlux, virtual threads |
| 09 | TDD: JUnit 5, AssertJ, Mockito, Spring Boot test slices |
| 10 | Capstone: order management system (architecture, build, test, deploy) |
| 11 | Kotlin Migration: syntax, coroutines, J2K converter, migration strategy |

## Project Structure

- `teaching/lessons/` — HTML lesson files (canonical source)
- `teaching/RESOURCES.md` — primary sources and references for each module
- `site/` — public website (Starlight/Astro), regenerated from HTML via `scripts/convert-lessons.mjs`
- `site/src/content/docs/lessons/` — Markdown lessons (generated, not edited directly)

## Getting Started

### Internal teaching lessons

Open `teaching/lessons/0001-java-records.html` in a browser. Each file has prev/next navigation and interactive quizzes.

### Public website

```bash
cd site
npm install
npm run dev
```

Runs at `http://localhost:4321`.

### Regenerate site from HTML

```bash
cd site
node scripts/convert-lessons.mjs
```

Converts all HTML lessons to Markdown for the Starlight site.

## Tech Stack

- **Java 21+** / **Spring Boot 4.1**
- **Kotlin** (module 11)
- **Site:** Astro 7, Starlight, Turndown (HTML to Markdown)
