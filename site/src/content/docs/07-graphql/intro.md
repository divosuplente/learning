---
title: "Module 07: Introduction"
description: "Introduction"
---

## What You'll Learn

- What an API is and a recap of REST concepts from Module 03
- The problems REST has: over-fetching and under-fetching
- What GraphQL is and how it solves REST's problems
- GraphQL vs REST: a side-by-side comparison
- Core GraphQL concepts: schema, types, queries, mutations, subscriptions
- The Schema Definition Language (SDL)
- How to model the Order Management domain with GraphQL
- Writing queries and mutations for orders, customers, and products
- Implementing resolvers in Spring Boot with `@QueryMapping`, `@MutationMapping`, and `@SchemaMapping`
- The N+1 problem in GraphQL and how to solve it with DataLoader
- Error handling in GraphQL
- GraphQL subscriptions with WebSockets
- Testing GraphQL endpoints with GraphiQL

## Prerequisites

- [Module 00: Java for Experienced Developers](./00-java-foundations.md) — you understand Java classes, records, interfaces
- [Module 01: Build Tools & Project Setup](./01-build-tools-and-project-setup.md) — you have a Spring Boot project
- [Module 02: Dependency Injection](./02-dependency-injection.md) — you understand Spring beans and constructor injection
- [Module 03: Spring Boot Fundamentals](./03-spring-boot-fundamentals.md) — you understand REST controllers and DTOs
- [Module 04: Repository Pattern](./04-repository-pattern.md) — you understand JPA entities and repositories
- [Module 05: Service-Oriented Architecture](./05-service-oriented-architecture.md) — you understand the service layer

---

<details>
<summary>Table of Contents</summary>

- [What You'll Learn](#what-youll-learn)
- [Prerequisites](#prerequisites)
- [1. What Is an API? (REST Recap)](#1-what-is-an-api-rest-recap)
- [2. Problems with REST](#2-problems-with-rest)
  - [Over-Fetching](#over-fetching)
  - [Under-Fetching](#under-fetching)
  - [The Root Cause](#the-root-cause)
- [3. What Is GraphQL?](#3-what-is-graphql)
  - [A GraphQL Query Example](#a-graphql-query-example)
  - [A More Complex Query](#a-more-complex-query)
- [4. GraphQL vs REST: Comparison](#4-graphql-vs-rest-comparison)
  - [When to Use GraphQL?](#when-to-use-graphql)
  - [When to Stay with REST?](#when-to-stay-with-rest)
- [5. Core GraphQL Concepts](#5-core-graphql-concepts)
  - [Schema](#schema)
  - [Types](#types)
  - [Queries](#queries)
  - [Mutations](#mutations)
  - [Subscriptions](#subscriptions)
- [6. Schema Definition Language (SDL)](#6-schema-definition-language-sdl)
  - [Key Points About the Schema](#key-points-about-the-schema)
- [7. Adding the GraphQL Dependency](#7-adding-the-graphql-dependency)
- [8. Custom Scalars](#8-custom-scalars)
  - [What Is a Coercing?](#what-is-a-coercing)
- [9. Resolvers in Spring Boot](#9-resolvers-in-spring-boot)
  - [Query Resolvers](#query-resolvers)
  - [What's Happening Here?](#whats-happening-here)
  - [Mutation Resolvers](#mutation-resolvers)
  - [Input Records](#input-records)
  - [Field Resolvers with @SchemaMapping](#field-resolvers-with-schemamapping)
- [10. Error Handling in GraphQL](#10-error-handling-in-graphql)
  - [Error Response Format](#error-response-format)
  - [Partial Results](#partial-results)
  - [Custom Exceptions in Spring Boot GraphQL](#custom-exceptions-in-spring-boot-graphql)
- [11. The N+1 Problem and DataLoader](#11-the-n1-problem-and-dataloader)
  - [What Is the N+1 Problem?](#what-is-the-n1-problem)
  - [How DataLoader Solves It](#how-dataloader-solves-it)
  - [Implementing DataLoader in Spring Boot](#implementing-dataloader-in-spring-boot)
  - [What @BatchMapping Does](#what-batchmapping-does)
- [12. GraphQL Subscriptions](#12-graphql-subscriptions)
  - [Setting Up Subscriptions](#setting-up-subscriptions)
- [13. Testing GraphQL with GraphiQL](#13-testing-graphql-with-graphiql)
  - [Example Queries to Try](#example-queries-to-try)
- [14. Security Overview (Brief)](#14-security-overview-brief)
  - [Authentication](#authentication)
  - [Authorization](#authorization)
  - [Query Depth Limiting](#query-depth-limiting)
  - [Rate Limiting](#rate-limiting)
- [What You Learned](#what-you-learned)
- [13. GraphQL Schema Design Best Practices](#13-graphql-schema-design-best-practices)
  - [Connection / Relay Pagination](#connection-relay-pagination)
  - [Input Types vs Arguments](#input-types-vs-arguments)
  - [Deprecation](#deprecation)
- [14. GraphQL Error Handling](#14-graphql-error-handling)
  - [Custom Error Extensions](#custom-error-extensions)
  - [Error Taxonomy](#error-taxonomy)
- [15. GraphQL Security](#15-graphql-security)
  - [Query Depth Limiting](#query-depth-limiting)
  - [Query Complexity Analysis](#query-complexity-analysis)
  - [Authentication in Resolvers](#authentication-in-resolvers)

</details>

## 1. What Is an API? (REST Recap)

An **API (Application Programming Interface)** is a contract that defines how software components communicate. In Module 03, you learned about **REST APIs**, where:

- Each resource has a URL: `/api/orders`, `/api/customers`, `/api/products`
- You use HTTP methods to act on them: `GET` to read, `POST` to create, `PUT` to update, `DELETE` to remove
- Data is exchanged as JSON

For example, to get order #42 in REST:

```
GET /api/orders/42

Response:
{
  "id": 42,
  "customerId": 7,
  "customerName": "Alice",
  "status": "CONFIRMED",
  "totalAmount": 129.99,
  "createdAt": "2025-01-15T10:30:00Z",
  "items": [
    { "id": 1, "productId": 100, "productName": "Widget", "quantity": 2, "unitPrice": 49.99 }
  ]
}
```

REST works well and is widely used. But it has limitations.

---

## 2. Problems with REST

### Over-Fetching

**Over-fetching** happens when the API returns more data than the client needs.

Imagine a mobile app that shows a list of orders. It only needs the order ID and status — but the REST endpoint returns the entire order object including all items, the customer details, timestamps, and more. That's wasted bandwidth and slower response times.

```
Client needs:  { "id": 42, "status": "CONFIRMED" }
REST returns:  { "id": 42, "customerId": 7, "customerName": "Alice", "status": "CONFIRMED",
                 "totalAmount": 129.99, "createdAt": "...", "items": [...] }
                                                          ↑ wasted data
```

### Under-Fetching

**Under-fetching** happens when the client needs to make multiple API calls to gather all the data it needs.

Imagine a dashboard that shows orders with customer names and product images. With REST, you might need:

1. `GET /api/orders` — get the orders (returns customer IDs, not names)
2. `GET /api/customers/7` — get customer details for order 1
3. `GET /api/customers/12` — get customer details for order 2
4. `GET /api/products/100` — get product details for the first item

That's 4+ network round trips. Each one adds latency.

### The Root Cause

The problem is that REST endpoints return a **fixed shape**. The server decides what data to return, regardless of what the client actually needs. Different clients (web app, mobile app, analytics dashboard) have different needs, but they all get the same response.

---

## 3. What Is GraphQL?

**GraphQL** is a query language for your API. Instead of the server deciding what data to return, the **client** specifies exactly what it wants, and the server returns exactly that — nothing more, nothing less.

Think of it like a restaurant:

- **REST** is like a set menu: you get whatever the chef decided to put on the plate. You might not want the salad, but it's there.
- **GraphQL** is like ordering a la carte: you pick exactly the dishes you want. Want just the steak? You get just the steak.

### A GraphQL Query Example

Instead of `GET /api/orders/42`, the client sends a **query** to a single GraphQL endpoint:

```
POST /graphql

{
  "query": "{ order(id: 42) { id status } }"
}
```

The server responds with exactly those fields:

```json
{
  "data": {
    "order": {
      "id": 42,
      "status": "CONFIRMED"
    }
  }
}
```

No over-fetching. The client asked for `id` and `status`, and that's all it got.

### A More Complex Query

The client can also ask for related data in a single request — no under-fetching:

```graphql
{
  order(id: 42) {
    id
    status
    customer {
      id
      name
    }
    items {
      quantity
      unitPrice
      product {
        id
        name
      }
    }
  }
}
```

This single query replaces what would have taken 3+ REST calls. The server resolves all the relationships and returns the complete data in one response.

---

## 4. GraphQL vs REST: Comparison

| Dimension | REST | GraphQL |
|-----------|------|---------|
| **Endpoints** | Many (`/api/orders`, `/api/customers`, etc.) | One (`/graphql`) |
| **Data shape** | Fixed by the server | Chosen by the client |
| **Over-fetching** | Common | Eliminated — client asks for only what it needs |
| **Under-fetching** | Common — multiple calls needed for related data | Eliminated — related data in one query |
| **Versioning** | URL versioning (`/v1/`, `/v2/`) or headers | Schema evolution — add fields without breaking old clients |
| **HTTP methods** | `GET`, `POST`, `PUT`, `DELETE` for different operations | `POST` for everything (queries and mutations) |
| **Caching** | HTTP caching (browser, CDN) | Needs custom caching (Apollo Client, etc.) |
| **Learning curve** | Lower — maps to HTTP concepts | Higher — new query language, schema concepts |
| **Best for** | Simple CRUD APIs, resource-oriented services | Complex data relationships, multiple client types |
| **File uploads** | Simple with `multipart/form-data` | Requires custom handling |

### When to Use GraphQL?

- You have multiple clients (web, iOS, Android) with different data needs
- Your data has complex relationships that require multiple REST calls to assemble
- You want to avoid versioning your API
- You want a single endpoint for the frontend to interact with

### When to Stay with REST?

- Your API is consumed by other servers (machine-to-machine) where over-fetching doesn't matter
- You need HTTP-level caching
- Your API is simple CRUD with few relationships
- Your team is not familiar with GraphQL

You can also use **both** — Spring Boot supports having REST and GraphQL endpoints in the same application.

---
