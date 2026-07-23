---
title: "Module 07: Error Handling"
description: "Error Handling"
---

## 10. Error Handling in GraphQL

Unlike REST, where each request returns a single HTTP status code, GraphQL uses HTTP 200 for most responses (even errors) and includes an `errors` array in the response body.

### Error Response Format

```json
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

### Partial Results

One of GraphQL's strengths is **partial results**. If a client queries for two things and one fails, the successful one is still returned:

```json
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

The `product` query succeeded, the `order` query failed. The client gets both.

### Custom Exceptions in Spring Boot GraphQL

Spring Boot for GraphQL automatically translates exceptions into GraphQL errors. For better error classification, create a custom exception handler:

```java
package com.example.ordermgmt.graphql;

import com.example.ordermgmt.service.exception.OrderNotFoundException;
import com.example.ordermgmt.service.exception.InsufficientStockException;
import org.springframework.graphql.data.method.annotation.GraphQlExceptionHandler;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.stereotype.Controller;

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
- `NOT_FOUND` — for "entity not found" errors (HTTP 404 equivalent)
- `BAD_REQUEST` — for validation errors (HTTP 400 equivalent)
- `FORBIDDEN` — for authorization errors (HTTP 403 equivalent)
- `INTERNAL_ERROR` — for unexpected errors (HTTP 500 equivalent)

---

## 16. GraphQL Error Handling

GraphQL returns 200 OK even when there are errors. Errors are included in the
response body, alongside any partial data.

### Custom Error Extensions

```java
@ControllerAdvice
public class GraphQLExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public GraphQLError handleNotFound(OrderNotFoundException ex) {
        return GraphQLError.newError()
                .message(ex.getMessage())
                .path(List.of("order"))
                .extensions(Map.of(
                        "code", "ORDER_NOT_FOUND",
                        "orderId", ex.getOrderId()
                ))
                .build();
    }

    @ExceptionHandler(InsufficientStockException.class)
    public GraphQLError handleStock(InsufficientStockException ex) {
        return GraphQLError.newError()
                .message(ex.getMessage())
                .extensions(Map.of(
                        "code", "INSUFFICIENT_STOCK",
                        "productName", ex.getProductName(),
                        "requested", ex.getRequested(),
                        "available", ex.getAvailable()
                ))
                .build();
    }
}
```

### Error Taxonomy

| Code | Meaning | HTTP-agnostic? |
|------|---------|----------------|
| `NOT_FOUND` | Resource doesn't exist | Yes |
| `VALIDATION_ERROR` | Invalid input | Yes |
| `UNAUTHORIZED` | Authentication required | Yes |
| `FORBIDDEN` | Not enough permissions | Yes |
| `CONFLICT` | State conflict (e.g., duplicate) | Yes |
| `INTERNAL_ERROR` | Unexpected server error | Yes |

---
