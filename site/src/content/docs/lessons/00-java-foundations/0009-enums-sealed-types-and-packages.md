---
title: "Lesson 9: Enums, Sealed Types & Packages"
description: "Lesson 9: Enums, Sealed Types & Packages"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0009-enums-sealed-types-and-packages.html
---

# Enums, Sealed Types & Packages

Real domains have **fixed sets of variants**: shipping methods, order statuses, payment types. Java enums make these type-safe at compile time, sealed types let you guarantee *no other variant exists*, and packages organize who can see what. Together they close the gap between your domain model and the type system.

## Enums: type-safe constants with behavior

Each enum constant is a singleton instance. Enums can carry fields, implement interfaces, and override methods per constant:

```
public enum ShippingMethod {
    STANDARD {
        @Override
        public BigDecimal cost(BigDecimal weight) {
            return weight.multiply(new BigDecimal("5.00"));
        }
    },
    EXPRESS {
        @Override
        public BigDecimal cost(BigDecimal weight) {
            return new BigDecimal("15.00")
                .add(weight.multiply(new BigDecimal("2.50")));
        }
    },
    SAME_DAY {
        @Override
        public BigDecimal cost(BigDecimal weight) {
            return new BigDecimal("50.00");
        }
    };

    public abstract BigDecimal cost(BigDecimal weight);
}
```

Because `cost` is `abstract`, every constant **must** implement it. Callers just write `method.cost(weight)`: no `if` chain, no missing case.

Enums can also carry shared fields and constructors:

```
public enum OrderStatus {
    PENDING("Waiting for confirmation"),
    CONFIRMED("Payment received"),
    SHIPPED("In transit"),
    DELIVERED("Delivered to customer");

    private final String description;

    OrderStatus(String description) {
        this.description = description;
    }

    public String getDescription() { return description; }
}
```

## Sealed interfaces: controlling the type hierarchy

A `sealed` type declares *exactly* which classes can implement or extend it. No one else can add a subtype:

```
public sealed interface Shape
    permits Circle, Rectangle, Triangle {}

public record Circle(double radius) implements Shape {}
public record Rectangle(double width, double height) implements Shape {}
public record Triangle(double base, double height) implements Shape {}
```

The compiler enforces three rules:

-   Every permitted subtype must be in the **same package** (or same compilation unit).
-   Each subtype must be `final`, `sealed`, or `non-sealed`: you must choose.
-   `non-sealed` re-opens the hierarchy; anyone can extend that subtype.

Sealed types unlock **exhaustive pattern matching**. When you switch over a sealed type and cover every permitted subtype, no `default` is needed; the compiler checks completeness.

## Package organization: one-way dependency flow

Packages are namespaces. A clean structure makes dependencies flow one way:

```
com.example.ordermgmt
├── domain/         # Records, enums, value objects
├── repository/     # Data access interfaces
├── service/        # Business logic
├── controller/     # HTTP endpoints
├── dto/            # Request/response objects
└── config/         # Configuration classes
```

The rule: `controller → service → repository → domain`. No layer depends on a layer above it. The `domain` package has zero dependencies on other layers; it defines the core types that everything else builds on.

## Visibility modifiers: who can see what

Java has four visibility levels. Use the most restrictive one that works:

| Modifier | Same class | Same package | Subclass | Anywhere |
| --- | --- | --- | --- | --- |
| `public` | Yes | Yes | Yes | Yes |
| `protected` | Yes | Yes | Yes | No |
| *package-private* | Yes | Yes | No | No |
| `private` | Yes | No | No | No |

-   **`private`**: fields and internal helpers. The default for most things.
-   **Package-private**: classes only used within the same package. The implicit default when you write nothing.
-   **`protected`**: for methods a subclass must override but outsiders shouldn't call.
-   **`public`**: API surface: domain records, service interfaces, controller endpoints.

**Primary sources:** [Oracle: Enum](https://docs.oracle.com/javase/21/docs/api/java.base/java/lang/Enum.html) · [Oracle: Sealed Classes (JLS)](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.1.1.2) · [Oracle: Packages](https://docs.oracle.com/javase/tutorial/java/package/index.html)

## Check your understanding

<details>
<summary>1. In the ShippingMethod enum, what happens if you add a new constant but forget to implement cost?</summary>
<p><strong>Correct answer:</strong> It fails to compile: abstract method unimplemented</p>
</details>

<details>
<summary>2. A sealed interface permits A, B. Class C in the same package tries implements on it. What happens?</summary>
<p><strong>Correct answer:</strong> It fails to compile: not in the permits list</p>
</details>

<details>
<summary>3. A method with no visibility modifier is accessible from:</summary>
<p><strong>Correct answer:</strong> Any class in the same package</p>
</details>

<details>
<summary>4. In the layered package structure, which dependency violates the one-way rule?</summary>
<p><strong>Correct answer:</strong> Domain layer importing service types</p>
</details>

<details>
<summary>5. A switch expression over a sealed interface Payment permits Cash, Card covers both cases. What happens if you add a default branch anyway?</summary>
<p><strong>Correct answer:</strong> It compiles: default is allowed but unreachable</p>
</details>
