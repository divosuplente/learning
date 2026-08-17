---
title: "Error Handling, Subscriptions & Module Review"
description: "Error Handling, Subscriptions & Module Review"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0044-graphql-error-handling-subscriptions.html
---

# Error Handling, Subscriptions & Module Review

GraphQL flips how APIs handle errors: **even a failed query returns HTTP 200**, with the real story told inside the response body. This lesson covers GraphQL's error format, partial results, custom exception handling in Spring Boot, real-time subscriptions over WebSockets, and a review of all things GraphQL from Module 07.

## GraphQL Always Returns 200 OK (Almost)

In REST, a missing resource is a 404. A bad request is a 400. In GraphQL, the HTTP status code is almost always `200` — even when the query fails. The error lives in the response JSON, inside an `errors` array:

```
// HTTP 200 — but the query failed
{
  "errors": [
    {
      "message": "Order not found: 999",
      "path": ["order"],
      "extensions": {
        "classification": "NOT_FOUND"
      }
    }
  ],
  "data": null
}
```

Why? A single GraphQL request can query *multiple* things. If one fails and the other succeeds, the HTTP status can't represent both states. So GraphQL uses 200 and puts the details in the body. An HTTP 4xx or 5xx usually means the request itself was malformed — bad JSON, missing headers — before the query even ran.

## Partial Results

One of GraphQL's most useful features is **partial results**. If a client queries for two things and only one fails, the successful one is still returned:

```
{
  "data": {
    "product": { "id": "1", "name": "Widget" }
  },
  "errors": [
    {
      "message": "Order not found: 999",
      "path": ["order"]
    }
  ]
}
```

The `product` query succeeded; the `order` query failed. The client gets both — it can render the product card and show an error message for the order, instead of showing a blank page.

The `path` field in each error tells the client *which field* failed, so it knows exactly what to mark as broken. Without `path`, the client would have to guess which piece of `data` is untrustworthy.

## Custom Exceptions in Spring Boot GraphQL

Spring Boot for GraphQL automatically translates exceptions into GraphQL errors. For better error classification, create a custom exception handler using `@GraphQlExceptionHandler`:

```
@Controller
public class GraphQlExceptionHandler {

    @GraphQlExceptionHandler
    public GraphQlError handleOrderNotFound(OrderNotFoundException ex) {
        return GraphQlError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.NOT_FOUND)
                .build();
    }

    @GraphQlExceptionHandler
    public GraphQlError handleInsufficientStock(InsufficientStockException ex) {
        return GraphQlError.newError()
                .message(ex.getMessage())
                .errorType(ErrorType.BAD_REQUEST)
                .build();
    }
}
```

This maps domain exceptions to appropriate GraphQL error types:

| ErrorType | REST Equivalent | When to Use |
| --- | --- | --- |
| `NOT_FOUND` | 404 | Entity does not exist |
| `BAD_REQUEST` | 400 | Validation or input errors |
| `FORBIDDEN` | 403 | Authorization failures |
| `INTERNAL_ERROR` | 500 | Unexpected server errors |

Without a handler, Spring wraps uncaught exceptions as `INTERNAL_ERROR` and hides the message for security. By handling them explicitly, you control exactly what the client sees.

## Subscriptions: Real-Time via WebSockets

Queries and mutations are request-response. Subscriptions are **push** — the server sends data to the client when events happen, instead of the client polling.

```
subscription {
  orderStatusChanged {
    orderId
    oldStatus
    newStatus
    changedAt
  }
}
```

Subscriptions use **WebSockets** — a persistent, bidirectional connection. When an order's status changes, the server pushes the update to every subscribed client.

WebSocket support requires the spring-boot-starter-websocket dependency:

```
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>
```

A subscription resolver returns a **Flux** — a reactive stream (covered in depth in Module 08). For now, think of `Sinks.Many` as a broadcaster: you push events in, all subscribers receive them:

```
@Controller
public class OrderSubscriptionResolver {

    private final Sinks.Many<OrderStatusChangedEvent> statusChangedSink =
            Sinks.many().multicast().onBackpressureBuffer();

    @SubscriptionMapping
    public reactor.core.publisher.Flux<OrderStatusChangedEvent> orderStatusChanged(
            @Argument(required = false) Long orderId) {

        if (orderId != null) {
            return statusChangedSink.asFlux()
                    .filter(event -> event.orderId().equals(orderId));
        }
        return statusChangedSink.asFlux();
    }

    public void publishStatusChange(Long orderId,
            String oldStatus, String newStatus) {
        statusChangedSink.tryEmitNext(new OrderStatusChangedEvent(
                orderId, oldStatus, newStatus, Instant.now()));
    }
}
```

The `@SubscriptionMapping` annotation marks this as a subscription. The optional `orderId` argument lets clients filter to a single order. The `publishStatusChange` method is called by the Kafka consumer (Module 06) when a status event arrives — bridging the async messaging world and the real-time GraphQL world.

## GraphiQL: The Browser IDE

**GraphiQL** (note the "i") is an in-browser IDE for exploring and testing your GraphQL API. Spring Boot exposes it automatically at `/graphiql` when the dependency is on the classpath. It provides:

-   **Query editor** with autocomplete based on your schema
-   **Schema explorer** — browse all types, fields, and documentation
-   **Variable panel** — pass query variables as JSON
-   **Response viewer** — formatted JSON with error details

It is the fastest way to test queries, mutations, and subscriptions during development. Do not ship it to production without authentication — it exposes your entire schema.

## Module 07 Review: GraphQL

Module 07 replaced a fixed REST contract with a client-driven query language. Here is the full picture:

| Lesson | Topic | Key Takeaway |
| --- | --- | --- |
| 40 | Over-fetching & under-fetching | REST endpoints return fixed shapes; clients get too much or too little |
| 41 | Queries, mutations, schema | GraphQL schema defines types; clients request exactly the fields they need |
| 42 | Spring Boot resolvers | `@QueryMapping`, `@MutationMapping` connect schema fields to Java code |
| 43 | N+1 & DataLoader | Nested resolvers cause N+1 queries; `@BatchMapping` batches them into one |
| 44 | Errors, subscriptions, review | Errors in the body, not the status code; subscriptions push via WebSockets |

The data flow for queries and mutations:

```
Client sends GraphQL query/mutation
  → Spring routes to @QueryMapping / @MutationMapping
    → Resolver calls Service (business logic)
      → Service calls Repository (data access)
        → Database
```

For subscriptions:

```
Kafka event arrives
  → Kafka consumer calls publishStatusChange()
    → Sinks.Many emits to Flux
      → WebSocket pushes to every subscribed client
```

GraphQL does not replace REST — it replaces the *rigid contract* of REST. You still need services, repositories, entities, and DTOs. The only thing that changes is the API layer: one endpoint, flexible queries, partial results, and real-time subscriptions.

**Primary sources:** [GraphQL Spec: Errors](https://spec.graphql.org/October2021/#sec-Errors) · [Spring for GraphQL Reference](https://docs.spring.io/spring-graphql/reference/) · [Spring: GraphiQL](https://docs.spring.io/spring-graphql/reference/client/graphiql.html) · [GraphQL: Subscriptions](https://graphql.org/learn/subscriptions/)

## Check your understanding

<details>
<summary>1. A GraphQL query fails because an order ID does not exist. What is the HTTP status code of the response?</summary>
<p><strong>Correct answer:</strong> 200 OK — the error is in the response body</p>
</details>

<details>
<summary>2. A client queries for both product and order in one request. The product is found but the order is not. What does the response contain?</summary>
<p><strong>Correct answer:</strong> Both data.product and errors — GraphQL returns partial results</p>
</details>

<details>
<summary>3. An unhandled InsufficientStockException is thrown inside a mutation. Without a custom @GraphQlExceptionHandler, what error type does the client see?</summary>
<p><strong>Correct answer:</strong> INTERNAL_ERROR — unhandled exceptions default to internal error with hidden messages</p>
</details>

<details>
<summary>4. What transport protocol do GraphQL subscriptions use to push real-time updates to clients?</summary>
<p><strong>Correct answer:</strong> WebSockets — a persistent bidirectional connection</p>
</details>

<details>
<summary>5. In a subscription resolver, Sinks.Many is used as a broadcaster. What happens when a new subscriber connects after events have already been emitted?</summary>
<p><strong>Correct answer:</strong> The new subscriber only receives events emitted after it connected — a multicast sink is hot</p>
</details>
