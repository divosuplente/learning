---
title: "Lesson 4: Pattern Matching with switch"
description: "Lesson 4: Pattern Matching with switch"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/00-java-foundations/0004-pattern-matching.md
---

# Pattern Matching with `switch`

Java 21 lets you match on types, destructure records, and add guard conditions inside `switch`. Long `if-else` chains with `instanceof` casts become concise, exhaustive switch expressions.

## Type patterns and variable binding

A **type pattern** matches the runtime type and binds a variable in one step: no casting needed:

```
String format(Object value) {
    return switch (value) {
        case null      -> "null";
        case String s  -> "\"" + s + "\"";
        case Integer i -> i.toString();
        case Double d  -> d + "d";
        default        -> value.toString();
    };
}
```

`case String s` does two things: checks `value instanceof String` and binds `s` to the cast result. Before Java 21, you wrote `if (value instanceof String) { String s = (String) value; ... }`. Three lines for what is now one case.

## Record destructuring in switch

Records expose their components via accessor methods. **Record patterns** extract those components directly in the case label:

```
record Point(double x, double y) {}
record Circle(Point center, double radius) {}
record Rectangle(Point topLeft, double w, double h) {}

String describe(Object shape) {
    return switch (shape) {
        case null -> "No shape";
        case Circle(Point c, double r) ->
            "Circle at " + c + " radius " + r;
        case Rectangle(Point tl, double w, double h) ->
            "Rectangle " + w + "x" + h;
        default -> "Unknown shape";
    };
}
```

The pattern `Circle(Point c, double r)` matches a `Circle` and extracts its `center` and `radius` in one step. Nested records destructure recursively: `Point c` captures the whole point.

## Guard clauses (`when`)

Add a `when` condition to refine a pattern. The case matches only if both the pattern *and* the guard succeed:

```
String describe(Object shape) {
    return switch (shape) {
        case Circle(Point c, double r) when r == 0 ->
            "Degenerate: point at " + c;
        case Circle(Point c, double r) ->
            "Circle at " + c + " radius " + r;
        case Rectangle(var tl, var w, var h) when w == h ->
            "Square " + w + "x" + h;
        case Rectangle(var tl, var w, var h) ->
            "Rectangle " + w + "x" + h;
        default -> "Unknown";
    };
}
```

**Order matters.** The guarded case `when r == 0` must appear before the unguarded `Circle` case. Switch evaluates top-to-bottom; if the unguarded case came first, it would swallow the zero-radius case.

## Sealed types and exhaustive switch

A `sealed` interface declares exactly which classes can implement it. When every permitted subtype is covered, the switch is **exhaustive**: no `default` needed:

```
sealed interface Payment permits CashPayment, CardPayment, BankTransfer {}
record CashPayment(BigDecimal amount, String currency) implements Payment {}
record CardPayment(BigDecimal amount, String cardLast4) implements Payment {}
record BankTransfer(BigDecimal amount, String iban) implements Payment {}

String describe(Payment p) {
    return switch (p) {
        case CashPayment(var amt, var cur)    -> "Cash: " + amt + " " + cur;
        case CardPayment(var amt, var last4)  -> "Card: " + amt + " (****" + last4 + ")";
        case BankTransfer(var amt, var iban)  -> "Transfer: " + amt + " to " + iban;
    };
}
```

Remove one case and the compiler errors; you didn't cover all permitted subtypes. This is the same exhaustiveness check you know from `enum` switches, but now it works for any sealed hierarchy.

**Primary source:** [Oracle: Pattern Matching for switch (JEP 441)](https://docs.oracle.com/en/java/javase/21/language/pattern-matching.html)

## Check your understanding

<details>
<summary>1. What does case String s do in a switch pattern?</summary>
<p><strong>Correct answer:</strong> Checks instanceof String and binds the cast result to s</p>
</details>

<details>
<summary>2. In this switch, which case handles a circle with radius 5?</summary>
<p><strong>Correct answer:</strong> The unguarded Circle case, because the guard fails and flow falls through</p>
</details>

<details>
<summary>3. A sealed interface Shape permits Circle, Square, Triangle. Your switch covers Circle and Square but omits Triangle. What happens?</summary>
<p><strong>Correct answer:</strong> Compile error: the switch is not exhaustive</p>
</details>

<details>
<summary>4. What will this switch do if shape is a Rectangle with width 3 and height 3?</summary>
<p><strong>Correct answer:</strong> Returns "Rectangle": the first matching case wins</p>
</details>

<details>
<summary>5. In a record pattern case CardPayment(var amt, var last4), what does var mean?</summary>
<p><strong>Correct answer:</strong> The compiler infers the type from the record component</p>
</details>
