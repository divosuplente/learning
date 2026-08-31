---
title: "Migration Strategy & Module Review"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/11-migrating-java-to-kotlin/0062-kotlin-migration-strategy.md
---

You've seen Kotlin's syntax, data classes, extension functions, and coroutines. Now the practical question: **how do you actually move a production Spring Boot codebase from Java to Kotlin?** This lesson covers the J2K converter, the recommended migration order, how Java and Kotlin coexist in the same project, testing Kotlin code with JUnit 5 and MockK, and wraps up the entire course.

## The J2K Converter: Your Migration Tool

IntelliJ IDEA (Community or Ultimate) ships with a **Java-to-Kotlin converter** (J2K). Open any Java file, press Ctrl/Cmd+Shift+Alt+K, and IntelliJ generates equivalent Kotlin code.

### What J2K Handles Well

-   **Classes → primary constructors**: fields and constructors collapse into the constructor header
-   **Getters/setters → `var`/`val` properties**: boilerplate removed
-   **Static methods → `companion object`**: the idiomatic Kotlin replacement
-   **`if-else` chains → `when` expressions**: sometimes, depending on structure

### What J2K Does NOT Handle

-   **Stream API**: J2K leaves Java-style streams instead of converting to Kotlin collection functions (`map`, `filter`, `groupBy`)
-   **Lombok annotations**: remove Lombok *before* converting, or J2K produces broken code
-   **Field injection**: J2K preserves `@Autowired` on fields instead of converting to constructor injection
-   **Java records**: sometimes generates verbose Kotlin classes instead of concise `data class`
-   **Builder patterns**: left as Java-style chains instead of using named arguments

The rule: **J2K gets you 80% there. The remaining 20% (null-safety annotations, collection idioms, Lombok removal) requires manual review.** Always read the converted code before committing.

## Gradual Migration: Java + Kotlin Side by Side

Kotlin's main advantage for migration is **full interoperability**. Java code can call Kotlin code. Kotlin code can call Java code. No wrappers, no adapters, no IDL. The Kotlin compiler compiles both languages together, so you can have `OrderService.java` and `CustomerService.kt` in the same package and they reference each other directly.

This means you migrate **one file at a time**. No big-bang rewrite. No feature freeze. The production system keeps running while you gradually convert modules.

### The Recommended Migration Order

1.  **DTOs (records → `data class`)**: Pure data, no behavior. Simplest to convert. Tests pass immediately.
2.  **Enums**: Trivial: `enum` becomes `enum class`, nearly identical syntax.
3.  **JPA Entities**: Require the `jpa` compiler plugin for the no-arg constructor. The `spring` plugin opens the class for CGLIB proxying.
4.  **Controllers**: Mostly annotation-driven. Replace `@RestController` classes with Kotlin equivalents.
5.  **Repositories**: Just interfaces extending `JpaRepository`. Trivial conversion.
6.  **Services**: The logic-heavy layer. Convert carefully; this is where bugs hide during migration.
7.  **Tests: convert last**: Tests should *validate* the migration, not be part of it. Keep existing Java tests running as a safety net while you convert production code.

This order minimizes risk: each step depends only on already-converted layers below it. DTOs have no dependencies. Entities depend on DTOs (already done). Services depend on Entities + Repos (already done). Tests validate everything.

### Interoperability gotchas

When Java calls Kotlin, there are a few wrinkles:

-   **Null safety is erased at the boundary.** A Kotlin `String` (non-nullable) is just `String` to Java, so Java can still pass `null`. Add `@NotNull` annotations or use platform types defensively.
-   **Kotlin `val` properties look like Java getters**: `val name: String` becomes `getName()`. Kotlin `var` also generates `setName()`.
-   **`companion object` methods**: From Java, you access them via `ClassName.Companion.method()` or add `@JvmStatic` to make them look like regular static methods.
-   **Checked exceptions**: Kotlin has no checked exceptions. A Kotlin function can throw any exception without declaring it. Java callers won't be forced to catch it.

## Testing Kotlin Code

### JUnit 5: Works Out of the Box

JUnit 5 runs Kotlin tests with zero configuration. Test method names can be **backtick-enclosed strings**: readable test names without camelCase gymnastics.

```
@ExtendWith(MockitoExtension::class)
class OrderServiceTest {

    @Mock
    private lateinit var orderRepository: OrderRepository

    @Mock
    private lateinit var eventProducer: OrderEventProducer

    @InjectMocks
    private lateinit var orderService: OrderService

    @Test
    fun `createOrder with valid request returns response`() {
        val customer = CustomerEntity("Alice", "alice@example.com", "123 Main")
        customer.id = 1L

        whenever(customerRepository.findById(1L))
            .thenReturn(Optional.of(customer))

        val request = CreateOrderRequest(1L,
            listOf(CreateOrderItemRequest(10L, 3)))

        val response = orderService.createOrder(request)

        assertEquals("Alice", response.customerName)
        verify(eventProducer).publishOrderCreated(any())
    }

    @Test
    fun `findById with nonexistent id throws exception`() {
        whenever(orderRepository.findById(999L))
            .thenReturn(Optional.empty())

        assertThrows<OrderNotFoundException> {
            orderService.findById(999L)
        }
    }
}
```

### Mockito → mockito-kotlin

Standard Mockito works with Kotlin, but `when()` is a Kotlin keyword. The `mockito-kotlin` library (`org.mockito.kotlin`) provides `whenever()` as a drop-in replacement and adds helpful extensions:

```
// Java Mockito
when(repo.findById(1L)).thenReturn(Optional.of(customer));

// Kotlin with mockito-kotlin
whenever(repo.findById(1L)).thenReturn(Optional.of(customer))
```

Add to your `pom.xml`:

```
<dependency>
    <groupId>org.mockito.kotlin</groupId>
    <artifactId>mockito-kotlin</artifactId>
    <version>5.4.0</version>
    <scope>test</scope>
</dependency>
```

### Testing Coroutines with `runTest`

`suspend` functions can't be called from regular test methods. The `kotlinx-coroutines-test` library provides `runTest`, which creates a virtual time-controlled coroutine scope:

```
import kotlinx.coroutines.test.runTest

class CoroutineOrderServiceTest {

    @Test
    fun `findAll returns all orders`() = runTest {
        val service = CoroutineOrderService(mockRepository)

        val result = service.findAll()

        assertEquals(3, result.size)
    }
}
```

`runTest` skips delays, advances virtual time automatically, and ensures the coroutine completes before the test returns. No `Thread.sleep`, no flaky async tests.

## Module 11 Review: Kotlin Migration

| Lesson | Core Idea |
| --- | --- |
| 58 — Why Kotlin & Setup | Interoperability, null safety, conciseness; adding Kotlin Maven plugin + compiler plugins (`spring`, `jpa`, `all-open`) |
| 59 — Syntax: Variables, Null Safety, Strings | `val`/`var`, nullable types (`T?`), safe calls (`?.`), Elvis (`?:`), string interpolation (`$name`) |
| 60 — Data Classes, Extensions & DSLs | `data class` with `copy()`/destructuring; extension functions add methods to any class; DSLs for routing and configuration |
| 61 — Coroutines vs Reactor | `suspend` functions replace `Mono`/`Flux`; `Flow<T>` replaces `Flux<T>`; structured concurrency eliminates callback chains |
| 62 — Migration Strategy & Review | J2K converter (80% auto, 20% review); migrate DTOs → enums → entities → controllers → services → repos → tests last; `mockito-kotlin` + `runTest` |

## Course Conclusion: From Java Records to Kotlin Coroutines

You started with a single `record` and ended with a fully reactive, event-driven order management system running on Kotlin coroutines. Here is the full arc:

| Module | What You Learned |
| --- | --- |
| 01 — Java Foundations | Records, composition, generics, pattern matching, collections, var/switch, exceptions, OOP, enums, packages |
| 02 — Spring Boot Start | Initializr, POM, config, Maven, running apps |
| 03 — Spring Core | Tight coupling & DI, IoC, injection types, bean scopes, circular deps, auto-configuration |
| 04 — Spring Web | REST controllers, request params, HTTP responses, validation |
| 05 — Spring Data | Database/repo pattern, ORM/JPA, entities, Spring Data, custom queries, N+1 |
| 06 — Architecture | Layered architecture, service layer, DTOs & events, anti-patterns |
| 07 — Async & Kafka | Sync vs async, Kafka concepts, producers/consumers, serialization, delivery semantics |
| 08 — Reactive & GraphQL | REST over/under-fetching, GraphQL basics/resolvers/N+1/error handling, reactive paradigm, Streams spec, Mono/Flux, error handling, WebFlux |
| 09 — TDD | Test pyramid, Red-Green-Refactor, JUnit 5 + AssertJ, Mockito, Spring Boot test slices |
| 10 — Capstone | Architecture assembly, building the order system end-to-end, testing & deployment |
| 11 — Kotlin Migration | Why Kotlin, syntax, data classes, extension functions, coroutines, migration strategy |

Every abstraction in this course (DI, JPA, Kafka, Reactor, coroutines) exists to make the code you write *simpler*, not fancier. If a tool makes your code harder to read, it is the wrong tool. You now have the experience to recognize the difference.

**Primary sources:** [Kotlin: Mixing Java and Kotlin](https://kotlinlang.org/docs/mixing-java-kotlin-intellij.html) · [Kotlin-Java Interop Reference](https://kotlinlang.org/docs/jvm-java-to-kotlin-interop.html) · [MockK](https://mockk.io/) · [kotlinx-coroutines-test](https://kotlinlang.org/api/kotlinx.coroutines/test/) · [Spring Boot with Kotlin Guide](https://spring.io/guides/tutorials/spring-boot-kotlin/)

## Check your understanding

<details>
<summary>1. You use J2K to convert a Java class that uses Lombok @Data. What goes wrong?</summary>
<p><strong>Correct answer:</strong> J2K produces broken Kotlin code because Lombok generates methods at compile time that J2K cannot see</p>
</details>

<details>
<summary>2. A Java service class calls a Kotlin function declared as fun process(name: String): Int. The Java code passes null for name. What happens at runtime?</summary>
<p><strong>Correct answer:</strong> The call compiles and Kotlin throws a NullPointerException at runtime because non-nullable contracts are not enforced across the Java boundary</p>
</details>

<details>
<summary>3. Why is the recommended migration order "DTOs first, tests last"?</summary>
<p><strong>Correct answer:</strong> Each layer depends on layers below it: DTOs have no dependencies so convert first; tests validate the migration so they run last as a safety net</p>
</details>

<details>
<summary>4. You need to test a Kotlin suspend function in a JUnit 5 test. Which approach is correct?</summary>
<p><strong>Correct answer:</strong> Use runTest { } from kotlinx-coroutines-test, which provides virtual time control and skips delays</p>
</details>

<details>
<summary>5. A Kotlin class has a companion object with a method fun from(entity: OrderEntity): OrderResponse. How does Java code call this method by default?</summary>
<p><strong>Correct answer:</strong> OrderResponse.Companion.from(entity): unless @JvmStatic is added</p>
</details>
