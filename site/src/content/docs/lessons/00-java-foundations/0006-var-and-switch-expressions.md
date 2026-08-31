---
title: "var & Switch Expressions"
description: "var & Switch Expressions"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/00-java-foundations/0006-var-and-switch-expressions.md
---

Two modern Java features that reduce boilerplate without changing runtime behavior: `var` lets the compiler infer local variable types, and switch expressions turn `switch` into something that returns a value. Both are purely compile-time conveniences, the JVM sees the same bytecode either way.

## The `var` keyword

`var` tells the compiler to figure out the type from the initializer. It works only for local variables with an initializer: not fields, not parameters, not return types.

```
// Without var
Map<String, List<Customer>> customersByCity = new HashMap<>();

// With var — same type, less visual noise
var customersByCity = new HashMap<String, List<Customer>>();
```

The inferred type is exactly what you'd write by hand. `var` is not `dynamic`; the variable is still statically typed.

## When `var` helps

-   **Long generic types** where the type is obvious from the right side.
-   **try-with-resources**: `try (var conn = ds.getConnection()) { ... }`
-   **for-each loops**: `for (var entry : map.entrySet()) { ... }`

```
var name = "Alice";                   // String
var price = new BigDecimal("19.99");  // BigDecimal
var orders = List.of(order1, order2); // List<Order>
var stream = orders.stream()           // Stream<Order>
    .filter(o -> o.total().compareTo(BigDecimal.valueOf(100)) > 0);
```

## When `var` hurts

-   **Unclear types**: `var result = process(data)` tells you nothing about the type.
-   **Interface vs implementation leak**: `var list = new ArrayList<String>()` infers `ArrayList`, not `List`. You lose the interface abstraction.
-   **Primitive surprises**: `var x = 0` is `int`, `var y = 0.0` is `double`, `var z = 0L` is `long`. These are all different.

```
var list = new ArrayList<String>();  // infers ArrayList, not List
var x = 0;     // int
var y = 0.0;   // double
var z = 0L;    // long
var flag = true; // boolean
```

> **Rule of thumb:** Use `var` when the type is obvious from the initializer, a constructor call or a factory method where the right side makes the type clear. Don't use it when a reader needs to look up the method signature to understand the type.

## Switch expressions

Java 14 made `switch` an expression; it returns a value. Combined with pattern matching, this replaces the old fall-through `switch` with a clean form.

```
// Old style — verbose, fall-through, error-prone
String dayType;
switch (day) {
    case MONDAY:
    case TUESDAY:
    case WEDNESDAY:
    case THURSDAY:
    case FRIDAY:
        dayType = "Weekday";
        break;
    case SATURDAY:
    case SUNDAY:
        dayType = "Weekend";
        break;
    default:
        dayType = "Unknown";
}

// New style — expression, no fall-through, returns a value
String dayType = switch (day) {
    case MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY -> "Weekday";
    case SATURDAY, SUNDAY -> "Weekend";
    default -> "Unknown";
};
```

## Arrow vs colon labels

-   **Arrow labels** (`->`): no fall-through. The expression or block on the right is the result.
-   **Colon labels** (`:`): fall-through. You must `break` or `yield` explicitly.

You can mix them, but you shouldn't. Arrow labels are strictly better: no fall-through bugs, less code, clearer intent.

## Block bodies with `yield`

When a case needs multiple statements, wrap them in a block and use `yield` to return the value:

```
String discount = switch (customer.tier()) {
    case BRONZE -> "5%";
    case SILVER -> "10%";
    case GOLD -> {
        if (customer.years() > 5) {
            yield "25% (loyal gold)";
        }
        yield "15%";
    }
    case PLATINUM -> "30%";
};
```

`yield` is not `return`. `return` exits the entire method; `yield` returns a value from the switch expression only. This is the most common source of confusion.

```
// In a switch expression inside a method:
String label = switch (status) {
    case ACTIVE -> "On";
    case INACTIVE -> {
        log.info("Inactive hit");  // multiple statements need a block
        yield "Off";               // yield, not return
    }
};
// 'return "Off"' would exit the enclosing method, not the switch
```

**Primary sources:** [Oracle: Local Variable Type Inference](https://docs.oracle.com/javase/10/language/local-variable-type-inference.htm) · [Oracle: Switch Expressions](https://docs.oracle.com/javase/14/language/switch-expressions.html)

## Check your understanding

<details>
<summary>1. What type does var x = 0; infer?</summary>
<p><strong>Correct answer:</strong> int: the default integer literal type</p>
</details>

<details>
<summary>2. What does var list = new ArrayList(); infer?</summary>
<p><strong>Correct answer:</strong> ArrayList<string>: the concrete type</string></p>
</details>

<details>
<summary>3. Inside a switch expression block body, which keyword returns the switch's value?</summary>
<p><strong>Correct answer:</strong> yield: returns from the switch only</p>
</details>

<details>
<summary>4. What is the key advantage of arrow labels (->) over colon labels (:) in a switch expression?</summary>
<p><strong>Correct answer:</strong> Arrow labels eliminate fall-through bugs</p>
</details>

<details>
<summary>5. What type does var x = 0.0; infer?</summary>
<p><strong>Correct answer:</strong> double: the default floating-point literal</p>
</details>
