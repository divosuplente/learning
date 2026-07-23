# Course Style Guide & Shared Domain

> **Every module author MUST read this file before writing. It defines the running example domain, code conventions, depth expectations, and cross-module references.**

## Audience

The learner is an **active developer** who already knows how to program in at least one language. They understand variables, functions, loops, conditionals, classes, and basic CS concepts. They need to learn Java and the surrounding backend ecosystem (Spring Boot, Kafka, GraphQL, Reactor, TDD, Kotlin).

Do NOT explain: what programming is, what a variable is, what a loop is, what a function is, what OOP is, what a compiler is. Assume all of these.

DO explain: Java-specific syntax and idioms, framework concepts (beans, IoC, entities, resolvers), architectural patterns, and ecosystem tooling.

## Pedagogical Rules

1. **Progressive disclosure.** Each module assumes all prior modules' content is known. When referencing a concept from an earlier module, link to it: `→ See [Module 02, Dependency Injection](./02-dependency-injection.md)`.
2. **One concept at a time.** Each subsection introduces exactly one idea. If you need two concepts to explain something, introduce them separately first.
3. **Code-first, then explanation.** Show complete, runnable code. Then explain what each part does line-by-line. Then explain *why*.
4. **Every code block must compile.** No pseudocode, no `// TODO`, no `...`. If the example is long, show the full file. Use `// ... other code from above` ONLY when repeating identical code from the same module.
5. **No exercises.** Modules do not contain exercises. The capstone project (Module 10) serves as the practical application of all concepts.
6. **Table of contents.** Every module starts with a collapsible table of contents listing all sections for quick navigation.
7. **Collapsible submodules.** Deep dives or advanced topics use `<details>` blocks. The core content stands alone without expanding them.
8. **Recap section.** Every module ends with a "What you learned" bullet list summarizing key takeaways.
9. **Depth rule:** Aim for 800–1500 lines per module. Better to be thorough than terse. These are standalone study materials.
10. **Introduce framework/ecosystem jargon.** First use of "bean," "IoC," "serializer," "backpressure," etc. gets a one-sentence definition in parentheses or a footnote. General programming jargon does not need explanation.

## Code Conventions

- Java 21+ syntax (records, pattern matching, var where it aids readability)
- 4-space indentation
- Constructor injection everywhere (never `@Autowired` on fields)
- Package naming: `com.example.ordermgmt.*`
- Use records for DTOs and value objects
- Use `var` for local variables when the type is obvious from the right side
- SLF4J for logging
- JUnit 5 + AssertJ for tests
- All comments use `//` (no block comments in examples)

## Running Example Domain: Order Management System

Throughout the course, we build an **Order Management System (OMS)** — a backend service for an e-commerce platform that manages orders, customers, and products.

### Domain Entities

```
Customer                    Product                     Order
├── id: Long                ├── id: Long                ├── id: Long
├── name: String            ├── name: String            ├── customer: Customer
├── email: String           ├── price: BigDecimal       ├── items: List<OrderItem>
├── address: String         ├── stock: int              ├── status: OrderStatus
└── createdAt: Instant      └── category: String        ├── totalAmount: BigDecimal
                            └── createdAt: Instant      └── createdAt: Instant

                            OrderItem
                            ├── id: Long
                            ├── product: Product
                            ├── quantity: int
                            └── unitPrice: BigDecimal

OrderStatus: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
```

### Package Structure (used across all modules)

```
com.example.ordermgmt
├── config/           # Spring configuration classes
├── controller/       # REST controllers (Module 03+)
├── graphql/          # GraphQL resolvers (Module 07+)
├── domain/           # Domain entities and enums
├── dto/              # Request/Response DTOs (records)
├── repository/       # Spring Data JPA repositories
├── service/          # Business logic layer
├── kafka/            # Kafka producers and consumers (Module 06+)
└── OrderManagementApplication.java  # Main entry point
```

### How Each Module Uses the Domain

| Module | What you build |
|--------|---------------|
| 00 - Java | `Customer`, `Product`, `Order` as plain Java classes/records |
| 01 - Build Tools | Project scaffold with `pom.xml` / `build.gradle` |
| 02 - DI | Wire `OrderService` with `OrderRepository` using Spring beans |
| 03 - Spring Boot | REST endpoints for CRUD on `Order` |
| 04 - Repository | JPA entities + Spring Data repositories for all entities |
| 05 - SOA | Service layer with transactions, DTOs, error handling |
| 06 - Kafka | Publish `OrderCreatedEvent`, consume with `OrderEventConsumer` |
| 07 - GraphQL | Queries for orders/products, mutations for creating orders |
| 08 - Reactor | Reactive `OrderFlux` streaming order updates |
| 09 - TDD | Tests for service, controller, repository, Kafka consumer |
| 10 - Capstone | Full integrated application with all layers |
| 11 - Kotlin | Migrate entities, services, and controllers to Kotlin |

## Module Format Template

```markdown
# Module NN: [Title]

## What You'll Learn

- Bullet 1
- Bullet 2
- ...

## Prerequisites

- [What the learner should have completed or read before this module]

---

## Table of Contents

<details>
<summary>Click to expand</summary>

- [Section 1](#section-1)
- [Section 2](#section-2)
  - [Subsection 2.1](#subsection-21)
  - [Subsection 2.2](#subsection-22)
- [Section 3](#section-3)

</details>

---

## [Section titles in logical order]

[Content with code examples]

<details>
<summary>Deep Dive: [Advanced Topic]</summary>

[Optional deeper coverage that can be expanded]

</details>

---

## What You Learned

- Key takeaway 1
- Key takeaway 2
- ...

---

← [Previous: Module XX](./XX-previous.md) | [Next: Module YY](./YY-next.md) →
```

## Cross-Module Consistency Checklist

Before submitting a module, verify:

- [ ] Domain entities match the shared model above (names, types, fields)
- [ ] Package structure follows the convention
- [ ] Code uses constructor injection, never field `@Autowired`
- [ ] Java 21+ syntax (records, var, pattern matching)
- [ ] Every framework/ecosystem concept is introduced before use
- [ ] Code blocks are complete and would compile
- [ ] Table of contents is present at the top
- [ ] Collapsible submodules use `<details>` blocks for optional deep dives
- [ ] "What You Learned" recap is present
- [ ] Nav links at the bottom point to correct module files
- [ ] No basic programming concepts are explained (assume the reader can code)
