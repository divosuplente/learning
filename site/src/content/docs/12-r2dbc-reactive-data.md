---
title: "Module 12: R2DBC & Reactive Data Access"
description: "Non-blocking database access with R2DBC and Spring Data R2DBC"
---

## What You'll Learn

- Why R2DBC exists and how it differs from JDBC (non-blocking vs blocking)
- Spring Data R2DBC repositories with `ReactiveCrudRepository`
- Reactive entities, derived queries, and `@Query` with native SQL
- Transaction management with `ReactiveTransactionTemplate`
- Batch operations, error handling, and backpressure
- When to use R2DBC and when to stick with JDBC/JPA

## Prerequisites

- Modules 04 (Repository Pattern) and 08 (Reactor Pattern) completed
- Understanding of Project Reactor `Mono` and `Flux`
- Familiarity with Spring Data JPA
