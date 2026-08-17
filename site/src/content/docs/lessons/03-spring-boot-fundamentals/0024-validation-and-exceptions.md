---
title: "Input Validation & Exception Handling"
description: "Input Validation & Exception Handling"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0024-validation-and-exceptions.html
---

# Input Validation & Exception Handling

Every API receives bad input eventually — missing fields, negative quantities, malformed email addresses. Without validation, garbage slips into your database. Without structured error handling, clients get ugly stack traces. This lesson covers **Jakarta Bean Validation** for declaring constraints on input, and **@RestControllerAdvice** for turning exceptions into clean HTTP responses.

## Jakarta Bean Validation — `jakarta.validation`, not `javax.validation`

Bean Validation (JSR 380) is a Java standard. Spring Boot integrates it via the `@Valid` annotation. The first thing to get right is the import — **Spring Boot 3.x uses Jakarta EE**, the renamed Java EE. Everything moved from `javax.validation` to `jakarta.validation`:

```
// CORRECT — Spring Boot 3.x (Jakarta)
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// WRONG — Spring Boot 2.x (Java EE, no longer used)
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
```

If you import from `javax.validation` on Boot 3, the annotations silently fail — they're different classes that Spring's validator doesn't recognize. This is the single most common validation bug when migrating from Boot 2.

## Validation annotations

Place constraint annotations directly on record fields or class properties:

| Annotation | What it checks | Applies to |
| --- | --- | --- |
| `@NotNull` | Value is not null | Any type |
| `@NotBlank` | Not null, not empty, not whitespace-only | String |
| `@NotEmpty` | Not null and not empty | String, Collection, Map |
| `@Size(min, max)` | Length is within range | String, Collection |
| `@Min(value)` | Number ≥ value | int, long, BigDecimal |
| `@Max(value)` | Number ≤ value | int, long, BigDecimal |
| `@Email` | Valid email format | String |
| `@Pattern(regexp)` | Matches regex | String |
| `@Positive` | Greater than 0 | Numbers |

Key subtleties: `@NotBlank` rejects `" "` (whitespace-only), but `@NotNull` and `@NotEmpty` do not. For a String that the user must provide meaningful content for, always prefer `@NotBlank`. `@Min(0)` allows zero; `@Positive` does not.

## DTOs with validation

Validation annotations live on your DTOs (request records), not on your entities. The DTO is the trust boundary — it's the first thing your code sees after deserialization:

```
public record CreateOrderRequest(
        @NotNull(message = "Customer ID is required")
        Long customerId,

        @NotEmpty(message = "Order must have at least one item")
        List<CreateOrderItemRequest> items
) {}

public record CreateOrderItemRequest(
        @NotNull(message = "Product ID is required")
        Long productId,

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity
) {}
```

The `message` attribute is optional — Jakarta provides default messages — but explicit messages are clearer for API consumers.

## Triggering validation with `@Valid`

Annotations on the DTO do nothing by themselves. You must add `@Valid` to the controller parameter:

```
@PostMapping
public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody CreateOrderRequest request) {
    // If validation fails, this method is NEVER called.
    // Spring returns 400 Bad Request automatically.
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(orderService.createOrder(request));
}
```

When `@Valid` is present, Spring Boot: (1) deserializes JSON into the record, (2) runs every constraint annotation, (3) if any fail, returns 400 Bad Request — the controller method body never executes, (4) if all pass, the method runs normally.

## Global exception handling with `@RestControllerAdvice`

Without a handler, unhandled exceptions produce a 500 with an HTML stack trace — useless and leaking internals. `@RestControllerAdvice` lets you intercept exceptions from *any* controller and return structured JSON instead:

```
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        ErrorResponse error = new ErrorResponse(
                Instant.now(), 400, "Bad Request", message);
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                Instant.now(), 500, "Internal Server Error",
                "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(error);
    }
}
```

`MethodArgumentNotValidException` is what Spring throws when `@Valid` fails. The `BindingResult` inside it carries every field error with the field name and message. The catch-all `Exception.class` handler ensures you never leak a stack trace — but log the exception internally so you can debug it.

## `ProblemDetail` — the RFC 7807 standard

Spring Framework 6 introduced `ProblemDetail`, a built-in class matching [RFC 7807 (Problem Details for HTTP APIs)](https://datatracker.ietf.org/doc/html/rfc7807). It gives you a standard error shape without writing a custom record:

```
import org.springframework.http.ProblemDetail;

@ExceptionHandler(OrderNotFoundException.class)
public ProblemDetail handleNotFound(OrderNotFoundException ex) {
    ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
    pd.setTitle("Order Not Found");
    pd.setDetail(ex.getMessage());
    pd.setProperty("orderId", ex.getOrderId());
    return pd;
}
```

`ProblemDetail` serializes to JSON with the standard fields `type`, `title`, `status`, `detail`, and `instance`. You can add custom properties with `setProperty`. The response `Content-Type` is `application/problem+json`. This is the preferred approach for new Spring Boot 3 projects — it's less code than a custom error record and follows a web standard.

Enable it globally by setting `spring.mvc.problemdetails.enabled=true` in `application.yml`, which makes Spring return `ProblemDetail` automatically for built-in errors (like 404s) too.

**Primary sources:** [Jakarta Bean Validation 3.0 API](https://jakarta.ee/specifications/bean-validation/3.0/apidocs/) · [Spring: Validation](https://docs.spring.io/spring-framework/reference/core/beans/validation.html) · [Spring: @ControllerAdvice](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html) · [Spring: ProblemDetail](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html)

## Check your understanding

<details>
<summary>1. You're using Spring Boot 3.2 and your @NotBlank annotation isn't triggering validation. The import reads import javax.validation.constraints.NotBlank;. What's wrong?</summary>
<p><strong>Correct answer:</strong> Boot 3 requires jakarta.validation, not javax.validation</p>
</details>

<details>
<summary>2. What is the difference between @NotBlank and @NotNull on a String field?</summary>
<p><strong>Correct answer:</strong> @NotBlank rejects " "; @NotNull accepts it</p>
</details>

<details>
<summary>3. When @Valid validation fails on a @RequestBody parameter, what happens?</summary>
<p><strong>Correct answer:</strong> A MethodArgumentNotValidException is thrown; the method is never called</p>
</details>

<details>
<summary>4. Which @ExceptionHandler signature correctly handles validation errors in a @RestControllerAdvice class?</summary>
<p><strong>Correct answer:</strong> @ExceptionHandler(MethodArgumentNotValidException.class)</p>
</details>

<details>
<summary>5. What does ProblemDetail provide that a custom ErrorResponse record does not?</summary>
<p><strong>Correct answer:</strong> RFC 7807 standard fields and application/problem+json content type</p>
</details>
