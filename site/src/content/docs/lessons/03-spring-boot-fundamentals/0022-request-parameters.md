---
title: "Request Parameters"
description: "Request Parameters"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/03-spring-boot-fundamentals/0022-request-parameters.md
---

Every HTTP request carries data in different places: the URL path, the query string, the body, the headers. Spring gives you one annotation per location. Pick the right one and the framework does the parsing for you. Pick the wrong one and you're fighting the framework instead of using it.

## `@PathVariable`: data in the URL

When the identifier is part of the URL itself, use `@PathVariable`. It extracts a named segment from the path template:

```
// GET /api/orders/42
@GetMapping("/{id}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
    // id = 42
}
```

The variable name in the annotation path (`{id}`) must match the method parameter name. If they differ, specify it explicitly: `@PathVariable("orderId") Long id`.

Path variables are **always required** by default. There is no `required = false`. If the segment is missing, Spring returns 404 because the route doesn't match at all, not because a parameter is null.

## `@RequestParam`: data in the query string

Query parameters sit after the `?` in a URL: `/api/orders?status=PENDING&page=2`. Use `@RequestParam` to pull them out:

```
// GET /api/orders?customerId=7&status=PENDING
@GetMapping
public ResponseEntity<List<OrderResponse>> listOrders(
        @RequestParam(required = false) Long customerId,
        @RequestParam(required = false) String status) {
    // customerId = 7, status = "PENDING"
}
```

By default, `@RequestParam` is **required**. Omit a required parameter and Spring returns **400 Bad Request**, not null, not an empty string. Setting `required = false` makes it optional; the value will be `null` when absent. For a safer default, use `defaultValue`:

```
@RequestParam(defaultValue = "0") int page,
@RequestParam(defaultValue = "20") int size
```

With `defaultValue`, the parameter is never null and `required` is implicitly false. This avoids `null` checks and `NumberFormatException` on primitive types.

## `@RequestBody`: data in the request body

POST and PUT requests send structured data (usually JSON) in the body. `@RequestBody` tells Jackson to deserialize it into a Java object:

```
// POST /api/orders  body: {"customerId":7,"items":[...]}
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    // request.customerId() = 7
}
```

Without `@RequestBody`, Spring tries to bind body fields to method parameters individually (form-encoded style), which almost never works with JSON. If you're sending JSON, you need this annotation.

`@RequestBody` is required by default. Send an empty body and you get **400 Bad Request**. Pair it with `@Valid` to trigger Bean Validation on the incoming object before it reaches your logic.

## `@RequestHeader`: data in HTTP headers

Headers carry metadata: authentication tokens, content types, tracing IDs. Pull them out with `@RequestHeader`:

```
@GetMapping
public ResponseEntity<List<OrderResponse>> listOrders(
        @RequestHeader(value = "Authorization", required = false) String auth,
        @RequestHeader(value = "X-Request-Id", required = false) String requestId) {
    // auth = "Bearer eyJhbGc..."
}
```

Like `@RequestParam`, headers are required by default. Set `required = false` for optional headers. For common headers, Spring provides `HttpHeaders` as a type-safe alternative: inject the whole object and read what you need.

## When to use each

| Annotation | Where the data lives | Use for | Required by default |
| --- | --- | --- | --- |
| `@PathVariable` | URL path segment | Identifying a resource (`/orders/42`) | Yes (no opt-out) |
| `@RequestParam` | Query string | Filtering, sorting, pagination (`?page=2`) | Yes |
| `@RequestBody` | Request body (JSON) | Creating or updating resources | Yes |
| `@RequestHeader` | HTTP header | Auth tokens, tracing IDs, content negotiation | Yes |

Rule of thumb: if it *identifies* the resource, it's a path variable. If it *filters* results, it's a query param. If it *is* the resource, it's a body. If it's *about* the request itself, it's a header.

**Primary sources:** [Spring: @RequestParam](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestparam.html) · [Spring: @PathVariable](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/pathvariable.html) · [Spring: @RequestBody](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html) · [Spring: @RequestHeader](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestheader.html)

## Check your understanding

<details>
<summary>1. A request to GET /api/orders/7 returns 404. The route is @GetMapping("/{id}") with @PathVariable Long id. What happens if the path variable is missing?</summary>
<p><strong>Correct answer:</strong> The route doesn't match at all; no controller method is invoked</p>
</details>

<details>
<summary>2. @RequestParam with required = false is used on a Long parameter. The client omits that query parameter entirely. What is the parameter's value inside the method?</summary>
<p><strong>Correct answer:</strong> null</p>
</details>

<details>
<summary>3. You send a JSON body to a POST endpoint but forget @RequestBody on the parameter. What happens?</summary>
<p><strong>Correct answer:</strong> Spring tries form-style binding and the object fields are all null or default</p>
</details>

<details>
<summary>4. Which annotation lets you set defaultValue = "0" so a primitive int parameter never equals null and is never required?</summary>
<p><strong>Correct answer:</strong> @RequestParam</p>
</details>

<details>
<summary>5. A client sends GET /api/orders?status= (the key exists but the value is empty). The parameter is @RequestParam(required = false) String status. What is status in the method?</summary>
<p><strong>Correct answer:</strong> An empty string ""</p>
</details>
