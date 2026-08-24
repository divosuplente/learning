---
title: "Kotlin Syntax: Variables, Null Safety & String Interpolation"
description: "Kotlin Syntax: Variables, Null Safety & String Interpolation"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/11-migrating-java-to-kotlin/0059-kotlin-syntax-basics.md
---

# Kotlin Syntax: Variables, Null Safety & String Interpolation

Kotlin's syntax removes large swaths of Java boilerplate. This lesson covers the first things you encounter when writing Kotlin: how to declare variables (`val`/`var`), how the type system makes `NullPointerException` a compile-time error, how to interpolate values into strings, how smart casts remove redundant type checks, and how `when` replaces the switch statement.

## Variables: val and var

Java has mutable references and `final` for immutability. Kotlin makes immutability the default with two keywords:

```
// Java
String name = "Alice";           // mutable
final int age = 30;              // immutable

// Kotlin
var name: String = "Alice"       // mutable
val age: Int = 30                // immutable (preferred)
val city = "NYC"                 // type inferred — String
```

-   **`val`**: read-only (like Java's `final`). **Prefer this by default.**
-   **`var`**: mutable. Use only when you must reassign.
-   **Type inference**: omit the type when the initializer makes it obvious. The compiler knows `city` is a `String`.

Assigning `null` to a `val` or `var` declared as non-nullable is a *compile-time error*. That is the null safety system, covered next.

## Null Safety

In Java, any object reference can be `null`, and accessing a member throws `NullPointerException` at runtime. Kotlin splits types into **non-nullable** and **nullable** at the type-system level.

```
var name: String = "Alice"             // non-nullable — CANNOT hold null
var nickname: String? = null           // nullable — explicitly marked with ?

name = null       // ← compile error
nickname = null   // ← fine
```

Once you have a nullable reference, Kotlin forces you to handle the null case before using it. Four tools:

### 1\. Safe call: `?.`

Returns the result if non-null, `null` otherwise. Chains naturally.

```
val length: Int? = nickname?.length     // null if nickname is null
```

### 2\. Elvis operator: `?:`

Provides a default when the left side is null. Named because it looks like Elvis's hair.

```
val safeLength: Int = nickname?.length ?: 0   // 0 if nickname is null
```

### 3\. Not-null assertion: `!!`

Forces a non-null conversion. **Throws `NullPointerException`** if the value is actually null. Use sparingly: it re-introduces the exact runtime crash Kotlin's type system is designed to prevent.

```
val forced: Int = nickname!!.length    // NPE if nickname is null!
```

### 4\. Smart cast

After a null check, Kotlin automatically treats the variable as non-nullable. No manual cast needed.

```
if (nickname != null) {
    val len: Int = nickname.length     // no ? needed — compiler knows it's non-null
}
```

Smart casts also work with `is` type checks, covered below.

## String Interpolation

Java uses `String.format()` or concatenation. Kotlin embeds expressions directly in string literals.

```
// Java
String msg = String.format("Hello %s, age %d", name, age);

// Kotlin
val msg = "Hello $name, age $age"                    // simple variable
val detail = "Name length: ${name.length}"            // expression
val nested = "Result: ${if (x > 0) "positive" else "non-positive"}"
```

-   `$variable`: insert a variable's `toString()`.
-   `${expression}`: insert any Kotlin expression.

## Smart Casting

In Java, after an `instanceof` check, you still cast explicitly. Kotlin's compiler performs **smart casts**: after a type check, the variable is automatically treated as that type.

```
// Java
if (obj instanceof String) {
    int len = ((String) obj).length();     // explicit cast required
}

// Kotlin
if (obj is String) {
    val len = obj.length                   // smart cast — no casting needed
}

// Smart cast also works in when expressions
when (value) {
    is String -> println(value.uppercase())    // value smart-cast to String
    is Int -> println(value.inc())             // value smart-cast to Int
    else -> println("Unknown type")
}
```

Smart casts are **not** available on `var` properties that could be mutated between the check and the use. The compiler is conservative and will require an explicit cast in that case.

## When Expression

Kotlin's `when` replaces Java's `switch`. It is **exhaustive** (the compiler checks you cover all cases for sealed types and enums), has no fall-through, and can match much more than constants.

```
// Basic matching (like Java switch)
val label = when (status) {
    OrderStatus.PENDING   -> "Waiting"
    OrderStatus.CONFIRMED -> "Confirmed"
    OrderStatus.SHIPPED   -> "In transit"
    OrderStatus.DELIVERED -> "Delivered"
    OrderStatus.CANCELLED -> "Cancelled"
}

// Range matching
val category = when (score) {
    in 90..100 -> "A"
    in 80..89  -> "B"
    in 70..79  -> "C"
    else       -> "F"
}

// Type matching (uses smart cast)
val description = when (payment) {
    is CreditCard -> "Card ending ${payment.lastFour}"
    is BankTransfer -> "Bank transfer ${payment.reference}"
    is Cash -> "Cash on delivery"
}

// Condition matching (no subject)
val msg = when {
    x > 0  -> "positive"
    x < 0  -> "negative"
    else   -> "zero"
}
```

-   **No `break`**: branches don't fall through.
-   **It's an expression**: it returns a value, just like Java's switch expression.
-   **Exhaustiveness**: for sealed classes and enums, the compiler errors if you miss a branch.

**Primary sources:** [Kotlin Null Safety](https://kotlinlang.org/docs/null-safety.html) · [Kotlin `when` Expression](https://kotlinlang.org/docs/control-flow.html#when-expression) · [Kotlin Smart Casts](https://kotlinlang.org/docs/typecasts.html#smart-casts) · [Kotlin String Templates](https://kotlinlang.org/docs/strings.html#string-templates)

## Check your understanding

<details>
<summary>1. What happens when you compile val name: String = null in Kotlin?</summary>
<p><strong>Correct answer:</strong> It is a compile-time error: String is non-nullable</p>
</details>

<details>
<summary>2. You write val forced = nickname!!.length where nickname is null. What happens?</summary>
<p><strong>Correct answer:</strong> It throws a KotlinNullPointerException at runtime</p>
</details>

<details>
<summary>3. In val msg = "Score: ${score + 1}", what does the ${…} syntax do?</summary>
<p><strong>Correct answer:</strong> It evaluates the Kotlin expression inside and interpolates the result</p>
</details>

<details>
<summary>4. After if (obj is String) passes in Kotlin, you write obj.length without casting. What enables this?</summary>
<p><strong>Correct answer:</strong> Smart cast: the compiler narrows the type after the is check</p>
</details>

<details>
<summary>5. Which is true about Kotlin's when compared to Java's switch?</summary>
<p><strong>Correct answer:</strong> when has no fall-through, can match ranges and types, and is exhaustive for sealed types</p>
</details>
