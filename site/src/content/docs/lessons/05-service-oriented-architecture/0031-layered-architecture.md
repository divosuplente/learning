---
title: "Layered Architecture"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/05-service-oriented-architecture/0031-layered-architecture.md
---

Inside every well-structured Spring Boot application, code is organized into **layers**, each with one job, each talking only to the layer directly below it. This lesson introduces the four layers you'll see in almost every Spring project: Controller, Service, Repository, and Database.

## The four layers

```
┌──────────────────────────────────────────────┐
│               Client (Browser, Mobile)        │
└──────────────────┬───────────────────────────┘
                   │ HTTP
┌──────────────────▼───────────────────────────┐
│            Controller Layer                   │
│  Receives HTTP requests, validates input,     │
│  returns HTTP responses                       │
│  Does NOT contain business logic              │
└──────────────────┬───────────────────────────┘
                   │ calls
┌──────────────────▼───────────────────────────┐
│              Service Layer                    │
│  Contains business logic, orchestrates        │
│  repository calls, enforces rules             │
│  This is the "brain" of the application       │
└──────────────────┬───────────────────────────┘
                   │ calls
┌──────────────────▼───────────────────────────┐
│            Repository Layer                   │
│  Talks to the database, executes queries      │
│  No business logic, just data access          │
└──────────────────┬───────────────────────────┘
                   │ SQL
┌──────────────────▼───────────────────────────┐
│              Database                         │
│  PostgreSQL — stores your data                │
└──────────────────────────────────────────────┘
```

Each layer has a single, well-defined responsibility:

| Layer | Responsibility | Spring annotation |
| --- | --- | --- |
| Controller | Accept HTTP requests, return HTTP responses | `@RestController` |
| Service | Business logic and orchestration | `@Service` |
| Repository | Data access (queries, saves, deletes) | `@Repository` / extends `JpaRepository` |
| Database | Persistent storage | — |

## The golden rule

**Each layer may only talk to the layer directly below it.**

-   Controllers call Services. Controllers do **not** call Repositories directly.
-   Services call Repositories. Services do **not** return HTTP responses.
-   Repositories talk to the Database. Repositories do **not** contain business logic.

This is not an arbitrary rule. It keeps responsibilities clean and makes the code easy to test, reason about, and change.

## Why not skip layers?

You might think: *"The controller just needs to list orders, so why not call the repository directly?"*

Because someday you'll need to add logic between the request and the database:

-   Check if the user is authorized to see these orders
-   Filter out cancelled orders
-   Cache the results
-   Send a notification when an order is viewed

If the controller calls the repository directly, all that logic ends up in the controller. The controller becomes a 500-line mess. The service layer exists to keep the controller thin.

The same argument works in the other direction: if the repository contained business logic, you couldn't reuse it from a different service or a scheduled task without duplicating that logic.

## A full request flow

Here is what happens when a client requests `GET /api/orders/42`:

```
1.  Client sends GET /api/orders/42
2.  Controller receives the request
      @GetMapping("/orders/{id}")
      public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
          return ResponseEntity.ok(orderService.getOrderById(id));
      }
3.  Service executes business logic
      @Transactional(readOnly = true)
      public OrderResponse getOrderById(Long id) {
          OrderEntity order = orderRepository.findById(id)
              .orElseThrow(() -> new OrderNotFoundException(id));
          return OrderResponse.from(order);
      }
4.  Repository queries the database
      findById(42) → SELECT * FROM orders WHERE id = 42
5.  Database returns the row
6.  Repository returns the entity to the service
7.  Service converts entity → DTO and returns to controller
8.  Controller wraps in ResponseEntity and sends HTTP 200 back
```

Notice what each layer does *not* do: the controller never touches the database, the repository never checks business rules, and the service never knows about HTTP.

## What happens when you break the rule

A controller calling a repository directly *works*: the code compiles and runs. But it creates two real problems:

**1\. Logic leaks into the wrong place.** Authorization checks, data transformation, and validation all merge into the controller. Now the controller depends on HTTP details *and* database details.

**2\. Duplication.** When a second entry point (a scheduled job, a message listener) needs the same data, you must duplicate the logic that was baked into the controller, or refactor the controller into a service anyway.

```
// Bad: controller bypasses the service layer
@RestController
public class OrderController {
    private final OrderRepository repo;   // ← wrong dependency
    @GetMapping("/orders/{id}")
    public OrderResponse get(@PathVariable Long id) {
        return repo.findById(id)           // ← no authorization check
            .map(OrderResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}

// Good: controller delegates to the service layer
@RestController
public class OrderController {
    private final OrderService service;    // ← correct dependency
    @GetMapping("/orders/{id}")
    public ResponseEntity<OrderResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.getOrderById(id));
    }
}
```

**Primary sources:** [Spring: Stereotype Annotations](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config.html) · [Spring Boot: Web](https://docs.spring.io/spring-boot/reference/web.html) · [Martin Fowler: Presentation-Domain-Data Layering](https://martinfowler.com/bliki/PresentationDomainDataLayering.html)

## Check your understanding

<details>
<summary>1. In a properly layered Spring Boot application, which layer contains business logic?</summary>
<p><strong>Correct answer:</strong> Service layer</p>
</details>

<details>
<summary>2. A controller needs to fetch a list of orders. Can it call the repository directly?</summary>
<p><strong>Correct answer:</strong> No — the golden rule says controllers call services, not repositories</p>
</details>

<details>
<summary>3. A service method calls another service method instead of the repository. Does this violate the golden rule?</summary>
<p><strong>Correct answer:</strong> No — services can call other services for orchestration</p>
</details>

<details>
<summary>4. Why is skipping the service layer problematic even if the controller just does a simple lookup?</summary>
<p><strong>Correct answer:</strong> Future requirements like authorization or caching will leak into the controller</p>
</details>

<details>
<summary>5. Which statement about the layers is true?</summary>
<p><strong>Correct answer:</strong> Repositories return entities; services convert them to DTOs; controllers wrap them in HTTP responses</p>
</details>
