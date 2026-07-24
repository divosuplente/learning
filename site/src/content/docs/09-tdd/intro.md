---
title: "Module 09: Introduction"
description: "Introduction"
---

## What You'll Learn

- What testing is and why we test our code
- The different types of tests: unit, integration, and end-to-end
- The test pyramid and why most tests should be unit tests
- What Test-Driven Development (TDD) is and the Red-Green-Refactor cycle
- How to write tests with JUnit 5
- How to write readable assertions with AssertJ
- How to mock dependencies with Mockito
- How to follow TDD step by step to build an `OrderCalculator` and `OrderService`
- Spring Boot test slices: `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`
- How to test REST controllers with MockMvc
- How to test repositories with Testcontainers
- How to measure test coverage with JaCoCo
- How to test Kafka consumers
- How to test reactive streams with StepVerifier

## Prerequisites

- [Module 00: Java for Experienced Developers](./00-java-foundations.md) — you understand Java classes, records, exceptions, generics
- [Module 01: Build Tools & Project Setup](./01-build-tools-and-project-setup.md) — you have a Maven project
- [Module 02: Dependency Injection](./02-dependency-injection.md) — you understand beans and constructor injection
- [Module 03: Spring Boot Fundamentals](./03-spring-boot-fundamentals.md) — you understand REST controllers and DTOs
- [Module 04: Repository Pattern](./04-repository-pattern.md) — you understand JPA entities and repositories
- [Module 05: Service-Oriented Architecture](./05-service-oriented-architecture.md) — you understand the service layer and transactions
- [Module 06: Kafka](./06-kafka.md) — you understand Kafka producers and consumers
- [Module 08: Reactor Pattern](./08-reactor-pattern.md) — you understand Mono and Flux (for testing reactive code)

---

<details>
<summary>Table of Contents</summary>

- [What You'll Learn](#what-youll-learn)
- [Prerequisites](#prerequisites)
- [1. What Is Testing? Why Do We Test?](#1-what-is-testing-why-do-we-test)
  - [Why Test?](#why-test)
  - [What Happens Without Tests?](#what-happens-without-tests)
- [2. Types of Tests](#2-types-of-tests)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
  - [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
- [3. The Test Pyramid](#3-the-test-pyramid)
- [4. What Is TDD?](#4-what-is-tdd)
  - [The Red-Green-Refactor Cycle](#the-red-green-refactor-cycle)
  - [Why TDD?](#why-tdd)
- [5. JUnit 5](#5-junit-5)
  - [Core Annotations](#core-annotations)
  - [A Simple Test Class](#a-simple-test-class)
  - [The Arrange-Act-Assert Pattern](#the-arrange-act-assert-pattern)
  - [Parameterized Tests](#parameterized-tests)
  - [Nested Tests](#nested-tests)
- [6. AssertJ](#6-assertj)
  - [Comparison](#comparison)
  - [Useful AssertJ Assertions](#useful-assertj-assertions)
  - [Why AssertJ Over JUnit Assertions?](#why-assertj-over-junit-assertions)
- [7. Mockito](#7-mockito)
  - [Core Mockito Concepts](#core-mockito-concepts)
  - [A Mocked Unit Test](#a-mocked-unit-test)
  - [What's Happening Here?](#whats-happening-here)
  - [When-ThenReturn: Stubs](#when-thenreturn-stubs)
  - [Verifying Interactions](#verifying-interactions)
  - [Argument Matchers](#argument-matchers)
- [8. TDD Walkthrough: Building OrderCalculator](#8-tdd-walkthrough-building-ordercalculator)
  - [Step 1: Red — Write a Failing Test](#step-1-red-write-a-failing-test)
  - [Step 2: Green — Write the Minimum Code](#step-2-green-write-the-minimum-code)
  - [Step 3: Red — Add Another Test](#step-3-red-add-another-test)
  - [Step 4: Red — Test for Negative Quantity](#step-4-red-test-for-negative-quantity)
  - [Step 5: Green — Add Validation](#step-5-green-add-validation)
  - [Step 6: Red — Test for Null Price](#step-6-red-test-for-null-price)
  - [Step 7: Green — Add Null Check](#step-7-green-add-null-check)
  - [Step 8: Refactor](#step-8-refactor)
- [9. TDD Walkthrough: Building OrderService](#9-tdd-walkthrough-building-orderservice)
  - [Step 1: Red — Write a Test for "Should Create Order"](#step-1-red-write-a-test-for-should-create-order)
  - [Step 2: Green — Implement createOrder](#step-2-green-implement-createorder)
  - [Step 3: Red — Test for "Should Throw When Customer Not Found"](#step-3-red-test-for-should-throw-when-customer-not-found)
  - [Step 4: Red — Test for "Should Throw When Stock Is Insufficient"](#step-4-red-test-for-should-throw-when-stock-is-insufficient)
- [10. Spring Boot Test Slices](#10-spring-boot-test-slices)
  - [Web Layer Tests with MockMvc](#web-layer-tests-with-mockmvc)
  - [What's Happening Here?](#whats-happening-here)
  - [Repository Tests with @DataJpaTest](#repository-tests-with-datajpatest)
  - [What's Happening Here?](#whats-happening-here)
- [11. JaCoCo: Measuring Test Coverage](#11-jacoco-measuring-test-coverage)
  - [Adding JaCoCo to Maven](#adding-jacoco-to-maven)
  - [Running Coverage](#running-coverage)
- [12. Testing Kafka Consumers](#12-testing-kafka-consumers)
  - [Adding Test Dependencies](#adding-test-dependencies)
  - [Kafka Consumer Test](#kafka-consumer-test)
- [13. Testing Reactive Streams with StepVerifier](#13-testing-reactive-streams-with-stepverifier)
  - [Adding the Dependency](#adding-the-dependency)
  - [StepVerifier Example](#stepverifier-example)
  - [What StepVerifier Does](#what-stepverifier-does)
- [14. Anti-Patterns to Avoid](#14-anti-patterns-to-avoid)
  - [Testing Implementation Details](#testing-implementation-details)
  - [Over-Mocking](#over-mocking)
  - [Brittle Tests](#brittle-tests)
  - [Testing Getters and Setters](#testing-getters-and-setters)
- [15. Best Practices Summary](#15-best-practices-summary)
- [What You Learned](#what-you-learned)
- [15. Test Smells and Anti-Patterns](#15-test-smells-and-anti-patterns)
  - [Testing Implementation Details (White-Box Testing)](#testing-implementation-details-white-box-testing)
  - [Excessive Mocking (Mock Everything Anti-Pattern)](#excessive-mocking-mock-everything-anti-pattern)
  - [Brittle Assertions](#brittle-assertions)
  - [Test Pyramid vs Ice Cream Cone](#test-pyramid-vs-ice-cream-cone)
- [16. Integration Testing Strategy](#16-integration-testing-strategy)
  - [Test Slices](#test-slices)
  - [When to Use Each](#when-to-use-each)
- [17. Test Coverage and Code Quality](#17-test-coverage-and-code-quality)
  - [JaCoCo Configuration](#jacoco-configuration)
  - [What to Cover vs What Not To](#what-to-cover-vs-what-not-to)
  - [Mutation Testing with PIT](#mutation-testing-with-pit)

</details>

## 1. What Is Testing? Why Do We Test?

**Testing** is the deliberate execution of your code to verify it does what you intend it to do. You write a piece of code, then you write another piece of code that calls the first piece and checks whether the result is correct.

### Why Test?

| Reason | Explanation |
|--------|-------------|
| **Catch bugs early** | A bug found during development costs minutes to fix. The same bug found in production costs hours or days. |
| **Prevent regressions** | When you change code, old tests verify you didn't break existing behavior. |
| **Living documentation** | Tests show how your code is supposed to be used. A new developer can read tests to understand the system. |
| **Design feedback** | If code is hard to test, it's usually badly designed — too many dependencies, too much coupling. |
| **Confidence** | With good tests, you can refactor and add features without fear of breaking things. |
| **Faster debugging** | When something breaks, a failing test points you to exactly which code is broken. |

### What Happens Without Tests?

1. You write code and manually test it (click through the UI or use curl)
2. It works, so you move on
3. Six months later, you add a new feature
4. The new feature breaks something you didn't think about
5. The bug reaches production
6. A customer reports it
7. You spend hours debugging because you don't remember how the old code works

Tests prevent steps 3 through 7.

---

## 2. Types of Tests

### Unit Tests

A **unit test** tests a single piece of code (a single method or class) in isolation. All external dependencies are replaced with **mocks** (fake versions that return predetermined values).

**Analogy:** Testing a single car part on a workbench — you test whether the alternator produces electricity, without needing the entire car.

**Speed:** milliseconds. You can run hundreds per second.

**Example:** Testing that `OrderService.createOrder()` throws `InsufficientStockException` when stock is too low, with a mocked repository that returns a product with low stock.

### Integration Tests

An **integration test** tests how multiple components work together. Dependencies are real, not mocked.

**Analogy:** Installing the alternator in the car and testing whether the battery charges when the engine runs.

**Speed:** seconds. They start a Spring context and talk to a real (or test) database.

**Example:** Testing that `OrderService.createOrder()` saves the order to a real PostgreSQL database running in a Docker container, and the order can be retrieved afterward.

### End-to-End (E2E) Tests

An **E2E test** tests the entire system from the outside, simulating a real user.

**Analogy:** Driving the car on the road to see if it starts, accelerates, and brakes.

**Speed:** minutes. They start the entire application and make real HTTP requests.

**Example:** Sending a `POST /api/orders` request to a running server and verifying the response, the database state, and that a Kafka event was published.

---

## 3. The Test Pyramid

The **test pyramid** is a guideline for how many of each test type you should have:

```
          ╱╲
         ╱  ╲           E2E Tests (few)
        ╱────╲
       ╱      ╲         Integration Tests (some)
      ╱────────╲
     ╱          ╲       Unit Tests (many)
    ╱────────────╲
```

| Level | Quantity | Why |
|-------|----------|-----|
| Unit tests | 80% of tests | Fast, isolate bugs, easy to write |
| Integration tests | 15% of tests | Verify components work together |
| E2E tests | 5% of tests | Slow, fragile, but verify the whole system |

**Why more unit tests?** They're fast (milliseconds), reliable (no external dependencies to fail), and precise (when one fails, you know exactly which code is broken). Integration and E2E tests are slower and when they fail, the cause could be anywhere.

---

## 4. What Is TDD?

**Test-Driven Development (TDD)** is a development practice where you write the test **before** you write the production code. This sounds backwards, but it's incredibly powerful.

### The Red-Green-Refactor Cycle

TDD follows a three-step cycle:

```
    ┌──────────┐
    │   RED    │  Write a test that fails (because the code doesn't exist yet)
    └────┬─────┘
         │
    ┌────▼─────┐
    │  GREEN   │  Write the minimum code to make the test pass
    └────┬─────┘
         │
    ┌────▼─────┐
    │ REFACTOR │  Improve the code without changing behavior (tests stay green)
    └────┬─────┘
         │
    └────>──── (repeat)
```

**Red:** You write a test that describes what you want the code to do. You run it. It fails because the code doesn't exist yet. This is called "red" because the test runner shows red (failure).

**Green:** You write the minimum code to make the test pass. This isn't about perfect code — it's about making the test pass as quickly as possible. You run the test. It passes (green).

**Refactor:** Now that the test passes, you improve the code — rename variables, extract methods, remove duplication — without changing behavior. You run the test after each change. It stays green, proving you didn't break anything.

### Why TDD?

1. **You never forget to write tests** — they come first, not last
2. **The code is testable by design** — if you write the test first, the code is naturally testable
3. **You only write code that's needed** — the test defines exactly what's needed; no speculative features
4. **Instant feedback** — you know within seconds whether your code works
5. **Living documentation** — tests describe what the code does, in executable form

---
