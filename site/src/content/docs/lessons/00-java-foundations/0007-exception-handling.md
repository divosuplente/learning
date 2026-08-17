---
title: "Exception Handling"
description: "Exception Handling"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0007-exception-handling.html
---

# Exception Handling

Exceptions signal that something went wrong. Java splits them into two families — **checked** (the compiler forces you to handle) and **unchecked** (runtime errors you may or may not catch). Knowing which to use — and when — keeps your APIs clean and your error paths honest.

## Checked vs Unchecked

```
import java.io.IOException;

// Checked — compiler forces you to declare or catch it
public String readFile(String path) throws IOException {
    throw new IOException("File not found: " + path);
}

// Unchecked — compiler doesn't force handling
public int divide(int a, int b) {
    if (b == 0) {
        throw new IllegalArgumentException("Cannot divide by zero");
    }
    return a / b;
}
```

**Checked exceptions** are for conditions the caller should reasonably handle — file I/O errors, network failures, database issues. **Unchecked exceptions** (`RuntimeException` and its subclasses) are for programming errors — null pointers, illegal arguments, index out of bounds.

## Why Spring Boot favors unchecked

Checked exceptions leak into every method signature up the call chain. A `throws IOException` on a data-access method forces every service and controller that calls it to declare or handle it — even when there's nothing sensible to do. Spring Boot's philosophy: use unchecked exceptions for domain errors, wrap checked exceptions at the boundary, and let a global `@ExceptionHandler` produce the HTTP response. Your service layer stays clean.

## Try-with-resources

Java 7+ automatically closes anything that implements `AutoCloseable`. No more `finally` blocks for cleanup:

```
try (Connection conn = DriverManager.getConnection(url, user, password)) {
    var stmt = conn.createStatement();
    var rs = stmt.executeQuery("SELECT * FROM customers");
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
} catch (SQLException e) {
    throw new RuntimeException("Database query failed", e);
}
// conn.close() is called automatically here
```

Multiple resources close in **reverse declaration order** — the last opened closes first:

```
try (var conn = ds.getConnection();
     var stmt = conn.prepareStatement("SELECT * FROM orders WHERE id = ?");
     var rs = stmt.executeQuery()) {
    // process results
} catch (SQLException e) {
    log.error("Query failed", e);
}
// closes rs → stmt → conn
```

If `rs` and `stmt` both throw on close, `stmt`'s exception is **suppressed** and attached to `rs`'s exception via `getSuppressed()`. You never lose error information.

## Custom domain exceptions

Define your own exceptions to make error handling **domain-specific** instead of leaking implementation details:

```
public class OrderException extends RuntimeException {
    public OrderException(String message) {
        super(message);
    }
    public OrderException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class OrderNotFoundException extends OrderException {
    public OrderNotFoundException(String orderId) {
        super("Order not found: " + orderId);
    }
}
```

Two constructors: one for simple messages, one that wraps a lower-level cause. Your controller catches `OrderNotFoundException` and returns 404 — it never needs to know about SQL.

## Best practices

-   **Catch specific exceptions**, not `catch (Exception e)` — broad catches mask real problems.
-   **Never swallow exceptions** — an empty catch block is a bug waiting to happen. At minimum, log it.
-   **Wrap and rethrow** — if you catch a low-level exception (SQL, IO), wrap it in a domain exception with context. Preserve the original cause.
-   **Keep try blocks small** — only wrap the code that might throw, not entire methods. Large try blocks hide which operation failed.

**Primary sources:** [Oracle: Exceptions](https://docs.oracle.com/javase/tutorial/essential/exceptions/) · [Oracle: AutoCloseable](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/AutoCloseable.html)

## Check your understanding

<details>
<summary>1. What does the compiler require when a method throws a checked exception?</summary>
<p><strong>Correct answer:</strong> Callers must catch it or declare it with throws</p>
</details>

<details>
<summary>2. In try (var a = ...; var b = ...; var c = ...), what order are the resources closed?</summary>
<p><strong>Correct answer:</strong> Reverse declaration order: c, then b, then a</p>
</details>

<details>
<summary>3. What happens if you write catch (Exception e) { } with an empty body?</summary>
<p><strong>Correct answer:</strong> The exception is silently swallowed — a hidden bug</p>
</details>

<details>
<summary>4. When two resources both throw on close in try-with-resources, what happens to the second exception?</summary>
<p><strong>Correct answer:</strong> It is suppressed and attached via getSuppressed()</p>
</details>

<details>
<summary>5. Why does Spring Boot prefer unchecked exceptions for domain errors?</summary>
<p><strong>Correct answer:</strong> Checked exceptions pollute every method signature up the call chain</p>
</details>
