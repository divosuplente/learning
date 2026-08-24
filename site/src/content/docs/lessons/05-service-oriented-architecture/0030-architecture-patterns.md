---
title: "Architecture Patterns: Monolith vs Microservices vs SOA"
description: "Architecture Patterns: Monolith vs Microservices vs SOA"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/05-service-oriented-architecture/0030-architecture-patterns.md
---

# Architecture Patterns: Monolith vs Microservices vs SOA

When you build a house, you don't start placing bricks randomly. You follow a blueprint. Software is no different. An **architecture pattern** is that blueprint: it defines which parts of the code talk to which other parts, what each part is responsible for, and how data flows through the system. Without one, code becomes a tangled mess where everything depends on everything else. Changing one thing breaks five others. This is **spaghetti code**, and it is a nightmare to maintain.

## Monolithic Architecture

A **monolith** is a single application where all the code lives in one codebase and runs as one process.

```
┌─────────────────────────────────┐
│         Monolithic App           │
│  ┌───────┐ ┌───────┐ ┌───────┐  │
│  │Orders │ │Users  │ │Billing│  │
│  └───────┘ └───────┘ └───────┘  │
│         Single database          │
└─────────────────────────────────┘
```

**Pros:** Simple to develop, deploy, and test. One codebase, one deployment. No network calls between modules; everything runs in the same JVM.

**Cons:** As the application grows, it becomes hard to understand and change. One bug can bring down the entire system. A memory leak in the billing module takes the order module with it.

## Microservices Architecture

**Microservices** split the application into many small, independently deployable services, each owning its own database.

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Order   │  │   User   │  │  Billing │
│ Service  │  │ Service  │  │ Service  │
│  (DB)    │  │  (DB)    │  │  (DB)    │
└──────────┘  └──────────┘  └──────────┘
```

**Pros:** Each service is small and focused. Teams can work independently. Services can be deployed, scaled, and restarted separately.

**Cons:** Complexity. Distributed systems are hard: network failures, data consistency across databases, debugging across service boundaries, and deployment orchestration all become significant challenges. A simple feature that touches two services now requires coordinating two deployments and handling eventual consistency.

## Service-Oriented Architecture (SOA): the middle ground

**SOA** as we use it in this course is a **modular monolith**: the application is a single deployable (one Spring Boot JAR), but the code is organized into logical **services**, groupings of business functionality. Each service has its own layered structure (controller, service, repository), but they share a database and run in the same process.

```
┌─────────────────────────────────────────┐
│              Spring Boot App              │
│                                           │
│  ┌─────────────────┐  ┌────────────────┐ │
│  │  Order Service   │  │ Customer Service│ │
│  │  ┌────────────┐  │  │  ┌──────────┐ │ │
│  │  │Controller  │  │  │  │Controller │ │ │
│  │  │  Service   │  │  │  │  Service  │ │ │
│  │  │ Repository │  │  │  │Repository │ │ │
│  │  └────────────┘  │  │  └──────────┘ │ │
│  └─────────────────┘  └────────────────┘ │
│                                           │
│           Shared Database                 │
└─────────────────────────────────────────┘
```

This gives you clean separation of concerns without the complexity of distributed systems. When the day comes that Order Service truly needs to scale independently, you can split it out into a real microservice, but only then, not before.

## When microservices are overkill

Microservices solve **organizational scaling** problems, not technical ones. If you are a team of five, the operational overhead of container orchestration, distributed tracing, service discovery, and inter-service network calls will consume more time than the features you're trying to ship. Start with a modular monolith. Extract services when you have a concrete reason: a module that needs different scaling, a different release cadence, or a different team.

**Primary sources:** [Oracle: Object-Oriented Programming Concepts](https://docs.oracle.com/javase/tutorial/java/concepts/) · [Spring: Building REST Services](https://spring.io/guides/gs/rest-service/) · [Fowler: Microservices](https://martinfowler.com/articles/microservices.html)

## Check your understanding

<details>
<summary>1. What does an architecture pattern primarily define?</summary>
<p><strong>Correct answer:</strong> Which parts of the code talk to which other parts</p>
</details>

<details>
<summary>2. In a microservices architecture, what is a key operational challenge that does not exist in a monolith?</summary>
<p><strong>Correct answer:</strong> Maintaining data consistency across separate databases</p>
</details>

<details>
<summary>3. Why is SOA (as used in this course) called a "modular monolith"?</summary>
<p><strong>Correct answer:</strong> Code is organized into logical services but deploys as one unit</p>
</details>

<details>
<summary>4. A startup with three developers is building an order management system. Which architecture should they choose?</summary>
<p><strong>Correct answer:</strong> Modular monolith — simple to operate, organized for future extraction</p>
</details>

<details>
<summary>5. What is a concrete reason to extract a service from a modular monolith into a true microservice?</summary>
<p><strong>Correct answer:</strong> It needs a different scaling or release cadence than the rest</p>
</details>
