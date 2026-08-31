---
title: "Java Records: Boilerplate-Free Data Classes"
description: "Lesson 1: Java Records: Boilerplate-Free Data Classes"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/00-java-foundations/0001-java-records.md
---

# Java Records: Boilerplate-Free Data Classes

If you've written data-carrying classes in any language, you know the drill: constructor, getters, `equals()`, `hashCode()`, `toString()`. Easily 50 lines of identical structure for something that should be one.

Java 16 introduced **records** to solve this. A record is an **immutable data carrier**. The compiler generates all that boilerplate for you.

**JDK version:** Spring Boot 4.1 supports Java 17, 21, 25, and 26. Java 21+ is recommended as the practical baseline. It gives you records, sealed types, pattern matching, and virtual threads. If you're starting fresh, install JDK 21.

## Your first record

```
public record Customer(
    String id,
    String name,
    String email) {}
```

That's it. You automatically get:

-   `customer.id()`, `customer.name()`, `customer.email()`: accessor methods
-   `equals()` and `hashCode()`: correct, field-based implementations
-   `toString()`: readable output like `Customer[id=1, name=Alice, email=alice@example.com]`
-   A constructor: `new Customer("1", "Alice", "alice@example.com")`

Records are **immutable by design**. There are no setters. Once created, a record's state cannot change. This makes them thread-safe and predictable: two qualities you'll rely on constantly in backend systems.

## Why this matters for your mission

Records appear everywhere in the courses ahead: as DTOs (data transfer objects) between API layers, as domain models, and as Kafka message payloads. Mastering them now saves you from boilerplate fatigue for the entire learning path.

**Primary source:** [Oracle: Records (Java 21)](https://docs.oracle.com/en/java/javase/21/language/records.html)

## Validating record fields

By default, records accept `null` values. In backend systems, `null` almost always means a bug waiting to happen. Records support a **compact constructor**, a validation block that runs during construction (before field assignment):

```
public record Order(
    String id,
    String customerName,
    java.math.BigDecimal total) {

    // Compact constructor — validates during construction
    public Order {
        if (id == null || customerName == null) {
            throw new IllegalArgumentException("id and customerName must not be null");
        }
        if (total == null || total.compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("total must be a non-negative amount");
        }
    }
}
```

This fails **fast and close to the source**. Instead of a `NullPointerException` deep in some other method, the error surfaces at the point where bad data enters.

**Key takeaway:** Records allow `null` by default. Add a compact constructor when `null` would break your logic.

## Check your understanding

<details>
<summary>1. Which of the following is true about Java records?</summary>
<p><strong>Correct answer:</strong> They are immutable and auto-generate equals/hashCode/toString</p>
</details>

<details>
<summary>2. How do you access the name field of Customer c?</summary>
<p><strong>Correct answer:</strong> c.name()</p>
</details>

<details>
<summary>3. What happens if you try to create a record with a null field?</summary>
<p><strong>Correct answer:</strong> It is allowed unless you add validation</p>
</details>

<details>
<summary>4. In a compact constructor, what happens if you reassign a parameter?</summary>
<p><strong>Correct answer:</strong> The reassigned value is used for that field</p>
</details>

<details>
<summary>5. Which statement about records vs regular classes is incorrect?</summary>
<p><strong>Correct answer:</strong> Records can declare instance fields outside the header</p>
</details>
