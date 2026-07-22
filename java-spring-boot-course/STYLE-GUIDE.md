# Course Style Guide & Shared Domain

> **Every module author MUST read this file before writing. It defines the running example domain, code conventions, depth expectations, and cross-module references.**

## Audience

The learner **knows nothing about programming**. Assume no prior experience with Java, any framework, or any concept. Every term must be introduced before use or explained inline on first appearance.

## Pedagogical Rules

1. **Progressive disclosure.** Each module assumes all prior modules' content is known. When referencing a concept from an earlier module, link to it: `→ See [Module 02, Dependency Injection](./02-dependency-injection.md)`.
2. **One concept at a time.** Each subsection introduces exactly one idea. If you need two concepts to explain something, introduce them separately first.
3. **Code-first, then explanation.** Show complete, runnable code. Then explain what each part does line-by-line. Then explain *why*.
4. **Every code block must compile.** No pseudocode, no `// TODO`, no `...`. If the example is long, show the full file. Use `// ... other code from above` ONLY when repeating identical code from the same module.
5. **Exercises at the end.** Every module ends with 3–5 exercises ranging from "modify this example" to "build this from scratch." Include solution hints (not full solutions) in a collapsed `<details>` block.
6. **Recap section.** Every module ends with a "What you learned" bullet list summarizing key takeaways.
7. **Depth rule:** Aim for 800–1500 lines per module. Better to be thorough than terse. These are standalone study materials.
8. **No jargon without introduction.** First use of "bean," "IoC," "serializer," "backpressure," etc. gets a one-sentence definition in parentheses or a footnote.

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

## [Section titles in logical order]

[Content with code examples]

---

## Exercises

### Exercise 1
[Task]

<details>
<summary>Hint</summary>
[Hint text]
</details>

### Exercise 2
...

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
- [ ] Every concept is introduced before use (assume no prior knowledge)
- [ ] Code blocks are complete and would compile
- [ ] Exercises are at the end in `<details>` hint blocks
- [ ] "What You Learned" recap is present
- [ ] Nav links at the bottom point to correct module files
- [ ] No jargon used without a first-use definition
