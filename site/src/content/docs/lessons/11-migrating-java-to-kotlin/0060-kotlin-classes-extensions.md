---
title: "Kotlin Data Classes, Extension Functions & DSLs"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/11-migrating-java-to-kotlin/0060-kotlin-classes-extensions.md
---

Java records gave you compact carriers for data. Kotlin's `data class` adds `copy()`, destructuring, and named arguments out of the box. But the bigger shift comes from **extension functions**, which let you add methods to classes you don't own, and **DSL builders**, which use Kotlin's syntax to create type-safe configuration languages. This lesson shows you how each works and when to reach for them in a Spring Boot project.

## Data Classes vs Java Records

Both auto-generate `equals()`, `hashCode()`, `toString()`, and accessors. Kotlin's `data class` adds three things records lack.

**Java (record):**

```
public record Customer(Long id, String name, String email) {}
```

**Kotlin (data class):**

```
data class Customer(
    val id: Long,
    val name: String,
    val email: String
)
```

### The three extras

-   **`copy()`**: create a modified clone without touching the original:  
    `val updated = customer.copy(email = "new@mail.com")`  
    Only the named properties change; everything else carries over. Java records have no equivalent: you must construct a new instance and repeat every field.
-   **`componentN()`**: destructuring declarations:  
    `val (id, name, _) = customer`  
    The underscore discards a component. Each property gets a synthetic `component1()`, `component2()`, etc., which the compiler calls when you destructure.
-   **Named arguments**: construct with names, not position:  
    `Customer(id = 1, name = "Alice", email = "a@b.com")`  
    This works on *any* Kotlin function, not just data classes. Combined with default arguments, it eliminates the telescoping-constructor problem without builders.

### When to use data class vs regular class

Use `data class` when the object's primary purpose is **holding data** (DTOs, request/response models, events). If the class has significant behavior or mutable state that shouldn't be part of `equals`/`hashCode`, use a regular `class`.

**Watch out:** Data classes are shallow. `equals()` and `hashCode()` use reference equality for mutable fields like `ArrayList`. Two data classes with identical list *contents* but different list *instances* will not be equal unless the list type itself implements structural equality.

## Properties: Auto-Generated Getters and Setters

In Java you write fields, getters, and setters explicitly. In Kotlin, `val` and `var` in the primary constructor **are** the properties. The compiler generates the accessors.

```
// Java
public class Product {
    private String name;
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

// Kotlin — same thing, one line
class Product(var name: String)
```

`val` generates a getter only (immutable). `var` generates both getter and setter (mutable).

### Custom getters and setters

You can override the auto-generated accessor inline, no wrapper method needed:

```
class Account(balance: Double) {
    var balance: Double = balance
        private set          // only readable from outside, not writable

    var description: String = ""
        get() = field.ifBlank { "No description" }  // computed getter with backing field

    val isOverdrawn: Boolean
        get() = balance < 0   // computed property, no backing field
}
```

The `field` identifier is the **backing field**. It only exists inside custom accessors and refers to the actual storage. This prevents the infinite recursion you'd get in Java if a getter called itself.

## Extension Functions

Extension functions add methods to an existing class **without inheritance**, **without modifying the source**, and **without wrappers**. They are resolved statically: the compiler rewrites them as top-level functions that take the receiver as the first argument.

```
// Add a method to String — no subclass needed
fun String.isEmail(): Boolean =
    this.contains("@") && this.contains(".")

// Add a method to BigDecimal
fun BigDecimal.toMoneyString(): String = "$${this.toPlainString()}"

// Usage — looks like a native method
val valid = "alice@example.com".isEmail()   // true
val price = BigDecimal("19.99").toMoneyString()  // "$19.99"
```

### How it works under the hood

The compiler transforms `fun String.isEmail()` into a static function:

```
// Roughly what the compiler generates (JVM bytecode)
fun isEmail(receiver: String): Boolean =
    receiver.contains("@") && receiver.contains(".")
```

Call-site syntax `email.isEmail()` is syntactic sugar: the compiler passes `email` as the receiver. This means extensions are **dispatched statically**. If you call an extension on a variable typed as the base class, the base-class version runs, even if the runtime object is a subclass. This is the key difference from virtual method dispatch.

### Practical Spring Boot extensions

```
// Make logging less verbose
fun Any.logger() = LoggerFactory.getLogger(this::class.java)

// Convert DTOs fluently
fun OrderEntity.toResponse() = OrderResponse(
    id = id,
    customerName = customer.name,
    status = status,
    totalAmount = totalAmount
)

// Usage in a service
val log = this.logger()
val responses = orders.map { it.toResponse() }
```

**Limitation:** Extension functions cannot access private or protected members of the receiver. They see only the public API, same as code in any other file.

## Companion Objects: Kotlin's Static

Kotlin has no `static` keyword. Instead, a `companion object` is a singleton nested inside a class. Its members are accessible via the class name, just like Java statics.

```
data class OrderResponse(
    val id: Long?,
    val customerName: String,
    val status: OrderStatus
) {
    companion object {
        fun from(entity: OrderEntity): OrderResponse = OrderResponse(
            id = entity.id,
            customerName = entity.customer.name,
            status = entity.status
        )
    }
}

// Call like a static method
val response = OrderResponse.from(entity)
```

Why a full object instead of a keyword? Because a companion object can **implement interfaces** and **be passed as a value**:

```
class JsonFactory {
    companion object : Loggable {     // implements an interface
        override val tag = "JsonFactory"
        fun create() = jacksonObjectMapper()
    }
}

// Pass the companion as an argument
fun configure(loggable: Loggable) { ... }
configure(JsonFactory)   // the companion object itself
```

## DSLs: Domain-Specific Languages in Kotlin

A DSL is an API designed to read like natural language within a specific domain. Kotlin's syntax (trailing lambdas, receiver lambdas, and infix functions) makes DSLs concise and type-safe.

### The two features that make DSLs work

1.  **Lambda with receiver**: inside the lambda, `this` refers to the receiver object, so you can call its methods without qualification:
    
    ```
    class QueryBuilder {
        fun select(columns: String) { ... }
        fun from(table: String) { ... }
    }
    
    fun query(init: QueryBuilder.() -> Unit): QueryBuilder {
        val builder = QueryBuilder()
        builder.init()   // 'this' inside init is the builder
        return builder
    }
    
    // Usage — looks like SQL
    query {
        select("id, name, email")
        from("customers")
    }
    ```
    
2.  **Trailing lambda**: if the last parameter is a function, you can move it outside the parentheses:
    
    ```
    // These are identical
    query({ select("id") })   // lambda inside parens
    query { select("id") }    // trailing lambda — cleaner
    ```
    

### Spring Boot routing DSL

Spring ships a Kotlin DSL for defining routes, an alternative to `@Controller` annotations:

```
@Configuration
class RoutesConfig {
    @Bean
    fun apiRoutes(ctrl: OrderController) = router {
        "/api/orders".nest {
            GET("/", ctrl::findAll)
            GET("/{id}", ctrl::findById)
            POST("/", ctrl::create)
        }
    }
}
```

Inside the `router { }` block, `this` is a `RouterFunctionDsl`. The `nest`, `GET`, and `POST` calls are methods on that receiver, called without prefix because of the lambda-with-receiver syntax.

### Building your own DSL

```
class EmailBuilder {
    var to: String = ""
    var subject: String = ""
    var body: String = ""

    fun build() = Email(to, subject, body)
}

fun email(init: EmailBuilder.() -> Unit): Email {
    val builder = EmailBuilder()
    builder.init()
    return builder.build()
}

// Usage
val msg = email {
    to = "alice@example.com"
    subject = "Order confirmed"
    body = "Your order #42 has shipped."
}
```

The pattern: a builder class with mutable properties, a function that takes a `Builder.() -> Unit` lambda, and a `build()` that constructs the immutable result. This replaces the Java Builder pattern with less code and better readability.

**Primary sources:** [Kotlin Data Classes](https://kotlinlang.org/docs/data-classes.html) · [Kotlin Extension Functions](https://kotlinlang.org/docs/extensions.html) · [Companion Objects](https://kotlinlang.org/docs/object-declarations.html#companion-objects) · [Type-Safe Builders (DSLs)](https://kotlinlang.org/docs/type-safe-builders.html) · [Spring Functional Routing](https://docs.spring.io/spring-framework/reference/web/webflux-functional.html)

## Check your understanding

<details>
<summary>1. A Kotlin data class auto-generates several methods. Which of these is NOT auto-generated?</summary>
<p><strong>Correct answer:</strong> clone() for deep copying</p>
</details>

<details>
<summary>2. You define an extension function fun Animal.sound() = "generic" and a subclass Dog : Animal with its own fun Dog.sound() = "woof". A variable val pet: Animal = Dog(): what does pet.sound() return?</summary>
<p><strong>Correct answer:</strong> "generic": extensions are dispatched statically by the declared type</p>
</details>

<details>
<summary>3. Inside a custom property setter, what does the field identifier refer to?</summary>
<p><strong>Correct answer:</strong> The auto-generated backing field that stores the property's value</p>
</details>

<details>
<summary>4. What is the advantage of a companion object over Java's static keyword?</summary>
<p><strong>Correct answer:</strong> A companion object can implement interfaces and be passed as a value</p>
</details>

<details>
<summary>5. In a Kotlin DSL, a function signature like fun router(init: RouterFunctionDsl.() -> Unit) uses a lambda with receiver. Inside the lambda router { }, what does this refer to?</summary>
<p><strong>Correct answer:</strong> A RouterFunctionDsl instance, so its methods can be called without qualification</p>
</details>
