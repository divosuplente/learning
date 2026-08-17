---
title: "REST Problems: Over-fetching & Under-fetching"
description: "REST Problems: Over-fetching & Under-fetching"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0040-rest-problems-over-under-fetching.html
---

# REST Problems: Over-fetching & Under-fetching

REST works well for simple CRUD. But when your clients have different data needs, **the fixed response shape becomes a bottleneck**. This lesson identifies two fundamental problems — over-fetching and under-fetching — and shows why GraphQL was created to solve them.

## The Recap: How REST Returns Data

In Module 03 you built REST endpoints. Each resource has a URL, each endpoint returns a **fixed JSON shape**, and the server decides what that shape looks like:

```
GET /api/orders/42

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

The endpoint always returns every field — whether the caller needs it or not. That's the root cause of both problems.

## Problem 1: Over-Fetching

**Over-fetching** is when the API returns more data than the client needs.

A mobile app shows a list of orders. It only needs `id` and `status` for each row — but the REST endpoint returns the full object including items, timestamps, customer details, and the total. The extra data wastes bandwidth and slows the response, especially on mobile networks.

```
Client needs:  { "id": 42, "status": "CONFIRMED" }
REST returns:  { "id": 42, "customerId": 7, "customerName": "Alice",
                 "status": "CONFIRMED", "totalAmount": 129.99,
                 "createdAt": "...", "items": [...] }
                                              ↑ wasted data
```

You could create a separate `/api/orders/summary` endpoint, but now you're maintaining two endpoints for the same resource — and the next client will want a slightly different subset.

## Problem 2: Under-Fetching

**Under-fetching** is when the client needs multiple API calls to gather all the data it needs.

A dashboard shows orders with customer names and product details. With REST, you might need:

1.  `GET /api/orders` — returns orders, but only `customerId`, not the name
2.  `GET /api/customers/7` — get customer details for order 1
3.  `GET /api/customers/12` — get customer details for order 2
4.  `GET /api/products/100` — get product details for the first item

That's 4+ round trips. Each network hop adds 50–200 ms of latency. On a slow connection, the dashboard is unusable.

Again, you could build a dedicated `/api/dashboard/orders` endpoint — but every new view needs its own endpoint, and they all return differently shaped data from the same underlying resources.

## The Root Cause: Fixed Response Shape

Both problems share the same cause. **REST endpoints return a fixed shape defined by the server.** Different clients — web app, mobile app, analytics dashboard — have different needs, but they all get the same response.

Workarounds exist, but each has a cost:

-   **Field-filtering parameters** (`GET /api/orders?fields=id,status`) — custom parsing on the server, easy to get wrong
-   **Multiple endpoints per shape** — maintenance burden, endpoint sprawl
-   **Embedding related data** (`GET /api/orders?expand=customer`) — still fixed choices defined by the server

None of these give the *client* full control over the data shape. That's what GraphQL fixes.

## How GraphQL Solves Both Problems

**GraphQL** is a query language for your API. Instead of the server deciding the response shape, the **client specifies exactly what it wants** in the request body, and the server returns exactly that — nothing more, nothing less.

Think of it like a restaurant:

-   **REST** is a set menu — you get whatever the chef decided. You may not want the salad, but it's on the plate.
-   **GraphQL** is à la carte — you pick exactly the dishes you want.

### Solving Over-Fetching

The client sends a query to a single endpoint `POST /graphql` and names only the fields it needs:

```
{
  "query": "{ order(id: 42) { id status } }"
}
```

The server responds with exactly those fields:

```
{
  "data": {
    "order": {
      "id": 42,
      "status": "CONFIRMED"
    }
  }
}
```

No wasted data. The client asked for `id` and `status`, and that's all it got.

### Solving Under-Fetching

The client can request related data in a single query — no extra round trips:

```
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

This single query replaces what would have taken 3+ REST calls. The server resolves all the relationships and returns the complete nested data in one response.

## When to Stay with REST

GraphQL isn't always better. REST remains the right choice when:

-   Your API is **machine-to-machine** — over-fetching doesn't matter when both sides are servers
-   You need **HTTP-level caching** — browsers and CDNs cache `GET` responses automatically; GraphQL needs custom caching
-   Your API is **simple CRUD** with few relationships — GraphQL's query language adds complexity for no gain

You can also use both. Spring Boot supports REST and GraphQL endpoints in the same application.

**Primary sources:** [GraphQL: Official Guide](https://graphql.org/learn/) · [GraphQL Specification](https://spec.graphql.org/) · [Spring for GraphQL Reference](https://docs.spring.io/spring-graphql/reference/)

## Check your understanding

<details>
<summary>1. A mobile app needs only id and status from the orders endpoint, but the server always returns all twelve fields. Which problem is this?</summary>
<p><strong>Correct answer:</strong> Over-fetching — the response contains more data than the client needs</p>
</details>

<details>
<summary>2. A dashboard calls GET /api/orders, then loops over each order's customerId to call GET /api/customers/{id}. Which problem is this?</summary>
<p><strong>Correct answer:</strong> Under-fetching — the client needs multiple round trips to assemble the data</p>
</details>

<details>
<summary>3. What is the root cause shared by both over-fetching and under-fetching in REST?</summary>
<p><strong>Correct answer:</strong> REST endpoints return a fixed shape defined by the server, not the client</p>
</details>

<details>
<summary>4. A team adds GET /api/orders/summary to return fewer fields for the mobile app. A month later, the analytics team wants yet another subset of fields. Why does this approach become unmaintainable?</summary>
<p><strong>Correct answer:</strong> Each new client subset requires a new endpoint — endpoint sprawl with fixed shapes that never match every client's needs</p>
</details>

<details>
<summary>5. Which of these is a valid reason to stay with REST instead of adopting GraphQL?</summary>
<p><strong>Correct answer:</strong> Your API needs HTTP-level caching that browsers and CDNs provide automatically</p>
</details>
