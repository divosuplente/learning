---
title: "Module 00: Java for Experienced Developers"
description: "Java for Experienced Developers"
---

## 1. Java 21 Records

Java 21 introduced **records**: a succinct way to model immutable data carriers. They reduce boilerplate for constructors, getters, equals, hashCode, and toString.

```java
import java.math.BigDecimal;

public record Customer(
        String id,
        String name,
        String email,
        // Money fields use BigDecimal for exact calculations
        BigDecimal balance) {
    // Implicit getters are generated
    // No need for a public constructor – compile‑time generated
}
```

**Key Benefits**
- Boiler‑plate‑free init
- Automatic `equals`, `hashCode`, `toString`
- Immutability by default (helps thread‑safety)
- Compact constructors (compact, single‑line)

### Compact Constructor with Variable Arguments

```java
public record Order(
        String id,
        Product product,
        Customer buyer,
        BigDecimal total,
        java.time.LocalDateTime timestamp) {
    public Order(String id, Product product, Customer buyer, BigDecimal total, java.time.LocalDateTime timestamp) {
        this.id = id;
        this.product = product;
        this.buyer = buyer;
        this.total = total;
        this.timestamp = timestamp;
    }
}
```

### Nested Records – Composition

```java
public record Product(
        String sku,
        String name,
        int stock,
        BigDecimal price) {}
```

```java
public record Order(
        String id,
        Product product,
        Customer buyer,
        BigDecimal total,
        java.time.LocalDateTime timestamp) {}
```

> **Note**: Records are **reference types**; they cannot be annotated with `@Entity` (for JPA) without a wrapper, but are perfect for pure‑model domain layers.

---

## Deep Dive: Record Advantages
### Why records matter
- Immutability eliminates defensive copies
- Reduce test boiler‑plate (no need for custom getters)
- Great for DTOs in Spring Boot (`@Model` can embed records)
- Pattern matching works naturally with records (see §3)

---

## 2. Generics

Generics let you write **type‑safe** reusable containers. The type parameter is erased at runtime, but compile‑time checks catch errors.

```java
import java.util.List;
import java.util.ArrayList;

class Box<T> {
    private List<T> items = new ArrayList<>();
    public void add(T item) { items.add(item); }
    public T get(int index) { return items.get(index); }
    public int size() { return items.size(); }
}
```

## Type‑Safe Instantiation

```java
Box<String> stringBox = new Box<>();
stringBox.add("hello"); // compile‑time checked
Box<Integer> intBox = new Box<>();
intBox.add("oops"); // ❌ compile‑time error
```

### Generic Super‑Types & Wildcards

```java
public class Statistics<T extends Number> {
    private final List<T> data = new ArrayList<>();
    public double average() {
        double sum = 0;
        for (T n : data) sum += n.doubleValue();
        return sum / data.size();
    }
}
```

**Wildcard Example** – allow any numeric types as readers.

```java
public class Sum<T extends Number> implements Function<T, Double> { // functional interface
    @Override
    public Double apply(T t) { return t.doubleValue(); }
}
```

> **Tip**: When forwarding generics, use `extends` for value‑semantics and `interface` for method‑semantics.

---

## Deep Dive: Limitations of Generics
### Don’t over‑engineer
- No runtime type information – cannot instantiate `Array<T>` directly; need `Object[]` cast
- `!` (diamond) limited to one generic per non‑static method
- `raw` types (e.g., `ArrayList`) cause unchecked warnings – prefer safe defaults

---

## 3. Pattern Matching (Method‑Based)

Java 21 added {@code switch} pattern matching for objects and primitives. It replaces `if‑else` chains, making code more expressive.

```java
record Point(double x, double y) {}

public String quadrant(Point p) {
    return switch (p) {
        case Point(0, 0) -> "origin";
        case Point(p.x, 0) when p.x > 0 -> "positive-x axis";
        case Point(p.x, 0) when p.x < 0 -> "negative-x axis";
        case Point(0, p.y) when p.y > 0 -> "positive-y axis";
        case Point(0, p.y) when p.y < 0 -> "negative-y axis";
        case Point(p.x, p.y) when p.x > 0 && p.y > 0 -> "first quadrant";
        case Point(p.x, p.y) when p.x < 0 && p.y > 0 -> "second quadrant";
        case Point(p.x, p.y) when p.x < 0 && p.y < 0 -> "third quadrant";
        case Point(p.x, p.y) when p.x > 0 && p.y < 0 -> "fourth quadrant";
        _ -> "elsewhere";
    };
}
```

### Pattern Matching with `var`

```java
public static void main(String[] args) {
    var person = new Customer("C001", "Alice", "alice@example.com", BigDecimal.valueOf(150.00));
    System.out.println(person.name()); // Invoke getter on record
}
```

> **Caveat**: Pattern matching is exhaustive; the underscore (`_`) pattern catches all unmatched cases.

---

## Deep Dive: Performance Considerations
### Pattern match overhead
- Compile‑time generated bytecode for switch forms – negligible for most domains
- Exhaustive patterns force you to consider all branches; use guard clauses wisely

---

## 4. The `var` Keyword

`var` is a **local variable type inference** introduced in Java 10, still present in Java 21. The compiler deduces the type from the initializer.

```java
var age = 30;               // int
var price = 19.99;           // double
var name = "Bob";           // String
var flag = true;             // boolean
var beans = List.of(1,2,3); // List<Integer>
```

### When to Prefer `var`
- In one‑line locals where the inferred type is obvious.
- In generic code where the generic type parameter is not needed explicitly.

### When to Avoid `var`
- **ISO‑compliance**: private static methods must be `static` and `private`; `var` does not eliminate staticness.
- **Large method bodies**: adding `var` in many places can obscure intent.
- **Complex initializations**: if the initializer is a method call with a generic return, the inferred type may be `Object`, leading to a loss of type safety.

> **Best practice**: Limit `var` usage to the top of the method, and never on parameters.

---

## Deep Dive: `var` and Lambdas
### Common Motif
```java
// Using var inside a lambda for local variable type inference
Supplier<String> supplier = () -> {
    var message = "dynamic";
    return message;
};
```

---

## 5. Switch Expressions

Java 14 introduced **switch expressions**, allowing the switch construct to return a value. Java 21 also supports **patterned** switches (combined with pattern matching).

```java
public String greeting(int hour) {
    return switch (hour) {
        case >18, >21 -> "Good evening";
        case 12, 13, 14 -> "Good afternoon";
        default -> "Hello";
    };
}
```

### Guard Clauses and Return Values
- Use `return` directly inside a case when returning a literal.
- Guard clauses (`case >0`) enable concise range checks.

### Nested Switch Expressions

```java
public String orderStatus(Order order) {
    return switch (order.type()) {
        case CART, FAVOURITE -> {
            // nested switch for discount
            return switch (order.amount()) {
                case amount when amount > 1000.00 -> "Platinum";
                case amount when amount > 500.00 -> "Gold";
                default -> "Standard";
            };
        }
        case DIGITAL -> "Instant Delivery";
        default -> "Pending";
    };
}
```

---

## Deep Dive: Switch vs. Traditional `if`
### Readability and Maintainability
- Switch expressions are more declarative and require fewer braces.
- They enforce exhaustiveness, reducing accidental fall‑through.
- For a large number of branches, consider `Map` lookups.

---

## 6. Collections Framework

The Java Collections Framework (JCF) is the backbone of data structures. It includes **Streams**, **List**, **Set**, **Map**, and **Queue**.

```java
List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
System.out.println(names.get(0)); // Alice

Set<String> unique = new HashSet<>();
unique.add("Alice");
unique.add("Alice"); // ignored
System.out.println(unique.size()); // 1

Map<String, BigDecimal> pricing = new HashMap<>();
pricing.put("DOG", new BigDecimal("199.99"));
```

## Streams – Functional Transformation

```java
List<BigDecimal> prices = pricing.values().stream()
    .map(BigDecimal::stripTrailingZeros)
    .sorted()
    .collect(Collectors.toList());
```

### Lazy Evaluation
- Streams are evaluated lazily; operations like `filter`, `map` are deferred until `collect` or `forEach` is called.
- This can improve performance for large data sets and enable **parallel streams**.

```java
prices.parallelStream().filter(p -> p.compareTo(new BigDecimal("100")) > 0)
      .forEach(p -> System.out.println(p));
```

### Common Pitfalls
- Using mutable collectors (`Collectors combined`), forgetting to close streams, or unnoticed side‑effects.
- Avoid collecting unless necessary – keep the pipeline in memory‑efficient form.

---

## Deep Dive: Collections with Records
### Immutable containers
```java
List<Order> orders = List.of(
    new Order("O001", new Product("P001", "Widget", 10, new BigDecimal("12.34")), new Customer("C001", "Alice", "alice@example.com", new BigDecimal("150.00")), new BigDecimal("123.40"), LocalDateTime.now()),
    new Order("O002", new Product("P002", "Gadget", 5, new BigDecimal("99.99")), new Customer("C002", "Bob", "bob@example.com", new BigDecimal("200.00")), new BigDecimal("199.98"), LocalDateTime.now())
);
```ensures the list cannot be modified after creation.

---

## 7. Exception Handling

Exceptions signal exceptional conditions. Java 21 introduced **checked** and **unchecked** exceptions, and the `final` keyword on `Exception` remains.

```java
try (Connection conn = DriverManager.getConnection(url)) {
    if (conn != null) {
        conn.close();
    }
} catch (SQLException e) {
    System.err.println("SQL error: " + e.getMessage());
    // Re‑throw if unrecoverable
    throw new RuntimeException("Database failure", e);
}
```

### `catch` Blocks vs Templates
- **Checked** Exception: compiler forces handling.
- **Unchecked** Exception (extends `RuntimeException`): can be caught but not required.

### Custom Exceptions
```java
public class OrderNotFoundException extends OrderException {
    public OrderNotFoundException(String id) { super("Order not found: " + id); }
}
```

### Best Practices
- Log inside `catch` – avoid printing directly to `System.err` in production.
- Throw **specific** exceptions; avoid `catch (Exception)` unless absolutely necessary.
- Keep the **try** block as small as possible to limit the exception scope.

---

## Deep Dive: Exception Hierarchy
### Why separate checked/uncheckeds?
- Checked exceptions enable API contracts (`public void read() throws IOException`).
- Unchecked beyond design; used for bugs (e.g., `NullPointerException`).
- Overriding `Throwable` can lead to confusion – avoid unless you own the whole ecosystem.

---

## 8. Packages and Imports

Packages provide namespace boundaries. Import statements shorten references.

```java
package com.example.ordermgmt.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import static com.example.ordermgmt.util.StringUtils.format;

public record Order(... ) {}
```

### When to Use `static import`
- For frequently used methods like `Collections.unmodifiableList()` or utility methods.
- Avoid over‑use – it can hide the source of a call.

### Avoiding Package Pollution
- Keep **public** packages narrowly scoped (`model`, `api`, `util`).
- Use **package‑private** (default) visibility for internal classes.

---

## Deep Dive: Cross‑Package Generic Packages
<>---
! No! The above is a placeholder. Need to continue.

---

## 9. Object‑Oriented Programming (OOP)

Java is fundamentally **object‑oriented**: classes are blueprints μικ‑
***

---

## What You Learned

- See the module content above for key takeaways.

---
[Next: Module 01 — Build Tools & Project Setup](../01-build-tools-and-project-setup/) →
