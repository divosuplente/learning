---
title: "HTTP Responses with ResponseEntity & Status Codes"
description: "HTTP Responses with ResponseEntity & Status Codes"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0023-http-responses.html
---

# HTTP Responses with `ResponseEntity` & Status Codes

A controller method that returns a plain object always sends **200 OK**. That's fine for reading data, but REST APIs need richer responses — **201 Created** when a resource is born, **204 No Content** after a deletion, **404 Not Found** when something doesn't exist. Spring's `ResponseEntity<T>` gives you full control over the status code, headers, and body in one return value.

## Why `ResponseEntity`?

Without it, your options are limited:

```
// Always 200 OK — no way to signal anything else
@GetMapping("/{id}")
public OrderResponse getOrder(@PathVariable Long id) {
    return orderService.getOrderById(id);
}
```

If the order doesn't exist, this throws an exception or returns `null` (which becomes 404 or 200-with-null — neither ideal). `ResponseEntity` lets you **explicitly choose** the status and, optionally, add headers:

```
@GetMapping("/{id}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
    return orderService.getOrderById(id)
        .map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
}
```

## The builder pattern

`ResponseEntity` uses static factory methods that read like English:

```
// 200 OK with body
return ResponseEntity.ok(order);

// 201 Created with body
return ResponseEntity.status(HttpStatus.CREATED).body(order);

// 204 No Content — no body
return ResponseEntity.noContent().build();

// 404 Not Found — no body
return ResponseEntity.notFound().build();

// 400 Bad Request with body
return ResponseEntity.badRequest().body(error);

// Custom status with headers
return ResponseEntity.status(HttpStatus.CONFLICT)
    .header("X-Conflict-Reason", "insufficient stock")
    .body(error);
```

Notice the pattern: methods like `.ok()` and `.noContent()` return a **builder**. You finish with `.body(…)` when you have a payload, or `.build()` when you don't. Calling `.build()` on a builder that expects a body compiles — but sends an empty response, which is almost certainly a bug.

## Status codes: when to use each

| Code | Name | Use when | Body? |
| --- | --- | --- | --- |
| **200** | OK | Successful GET or PUT that returns data | Yes |
| **201** | Created | POST that creates a new resource | Yes — the created resource |
| **204** | No Content | DELETE, or PUT that returns nothing | No |
| **400** | Bad Request | Client sent invalid input | Usually — error details |
| **404** | Not Found | Requested resource doesn't exist | Optional — error details |
| **409** | Conflict | Action conflicts with current state | Usually — reason |
| **500** | Internal Server Error | Unexpected server failure | Rarely — don't leak stack traces |

## 201 vs 204 — the tricky pair

Both indicate success, but they mean different things:

-   **201 Created** — a new resource was born. The response body should contain it (so the client gets the server-assigned ID, timestamps, etc.). Also convention: include a `Location` header pointing to the new resource.
-   **204 No Content** — the action succeeded, but there's nothing to return. Classic case: `DELETE /api/orders/42`. The resource is gone; there's nothing to show.

```
// POST — creates something, so 201 + body + Location header
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest req) {
    OrderResponse created = orderService.createOrder(req);
    URI location = URI.create("/api/orders/" + created.id());
    return ResponseEntity.created(location).body(created);
}

// DELETE — nothing left to return, so 204
@DeleteMapping("/{id}")
public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
    orderService.deleteOrder(id);
    return ResponseEntity.noContent().build();
}
```

`ResponseEntity.created(location)` is a convenience — it sets both the 201 status *and* the `Location` header in one call.

## 409 Conflict — when to reach for it

Use 409 when the request is *valid* but can't be satisfied because of the *current state* of the system:

-   Placing an order for 10 items when only 3 are in stock
-   Creating a user with an email that's already registered
-   Updating a record that was modified by someone else since you read it (optimistic locking)

400 Bad Request says "your input is malformed." 409 Conflict says "your input is fine, but the world won't allow it right now."

## What `ResponseEntity.ok()` actually returns

The `.ok()` method is overloaded:

```
// Shortcut: status 200 + body in one call
return ResponseEntity.ok(order);         // ResponseEntity<Order>

// Builder: status 200, body supplied later
return ResponseEntity.ok()               // HeadersBuilder
    .header("X-Total-Count", "42")
    .body(orders);                       // ResponseEntity<List<Order>>
```

The first form returns the final `ResponseEntity` immediately — you can't chain `.header()` after it. If you need headers, use the no-arg `.ok()` builder form.

## Full CRUD example

```
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> listOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest req) {
        OrderResponse created = orderService.createOrder(req);
        return ResponseEntity
            .created(URI.create("/api/orders/" + created.id()))
            .body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Primary sources:** [Spring: ResponseEntity](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responseentity.html) · [Spring: @ResponseStatus](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responsestatus.html) · [RFC 9110: Status Codes](https://datatracker.ietf.org/doc/html/rfc9110#section-15)

## Check your understanding

<details>
<summary>1. What does ResponseEntity.ok(order) return?</summary>
<p><strong>Correct answer:</strong> A completed ResponseEntity with status 200 and the body set</p>
</details>

<details>
<summary>2. A client sends DELETE /api/orders/42 and the order is successfully removed. What status should the response use?</summary>
<p><strong>Correct answer:</strong> 204 No Content with no body</p>
</details>

<details>
<summary>3. A user tries to register with an email that's already taken. The input format is valid. Which status code fits best?</summary>
<p><strong>Correct answer:</strong> 409 Conflict — valid input, but current state prevents it</p>
</details>

<details>
<summary>4. What's the difference between ResponseEntity.ok(order) and ResponseEntity.ok().body(order)?</summary>
<p><strong>Correct answer:</strong> The latter lets you chain .header() before .body(); the former does not</p>
</details>

<details>
<summary>5. ResponseEntity.created(location).body(order) sets which status code and header automatically?</summary>
<p><strong>Correct answer:</strong> Status 201 and header Location</p>
</details>
