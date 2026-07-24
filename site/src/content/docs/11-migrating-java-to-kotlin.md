---
title: "Module 11: Migrating Java to Kotlin"
description: "Migrating Java to Kotlin"
---

## What You'll Learn

- Why Kotlin is a compelling alternative to Java for Spring Boot applications
- How Kotlin's syntax compares to Java — line-by-line equivalents
- How to add Kotlin to an existing Spring Boot Maven project
- How to convert Java entities, DTOs, services, and controllers to Kotlin
- How Kotlin's **null safety** system prevents NullPointerException at compile time
- How to use **Kotlin coroutines** as an alternative to Reactor's Mono/Flux
- How Kotlin **data classes**, **extension functions**, and **DSLs** simplify code
- How to use Kotlin-specific Spring Boot features (routing DSL, coroutine repositories)
- A step-by-step migration strategy with automated tools (J2K converter)
- How to test Kotlin code with JUnit 5, MockK, and kotest-assertions

## Prerequisites

- All prior modules (00-10) must be completed
- Java 21+, Maven, and an IDE (IntelliJ IDEA Community or Ultimate)
- Understanding of: Java OOP, Spring Boot DI/REST/JPA, records, Reactor Mono/Flux

---

## 1. Why Kotlin?

**Kotlin** is a modern, statically-typed programming language that runs on the JVM.
It was created by JetBrains (the company behind IntelliJ IDEA) and is fully
**interoperable** with Java — you can call Java code from Kotlin and vice versa
without any wrappers or adapters.

Google made Kotlin the preferred language for Android development in 2019, and
Spring Boot added first-class Kotlin support starting with Spring Framework 5.0
(2017). Today, many production Spring Boot applications run on Kotlin.

### Java vs Kotlin: Quick Comparison

| Feature | Java 21 | Kotlin |
|---------|---------|--------|
| Null safety | Optional API (runtime) | Built-in type system (compile-time) |
| Data classes | Records (Java 16+) | `data class` (since Kotlin 1.0) |
| String interpolation | `String.format()` or concatenation | `"Hello $name"` |
| Smart casting | `instanceof` + cast | `is` check, automatic cast |
| Extension functions | Not available | Built-in |
| Coroutines | Virtual threads (Java 21) | `suspend` functions, structured concurrency |
| Pattern matching | Switch expressions (Java 21) | `when` expression |
| Properties | Getters/setters boilerplate | `val`/`var` — getters/setters auto-generated |
| Default arguments | Not available | Built-in |
| Named arguments | Not available | Built-in |
| Sealed classes | Sealed interfaces (Java 17+) | `sealed class` (since Kotlin 1.0) |
| Collection literals | `List.of()`, `Map.of()` | `listOf()`, `mapOf()` |

### Should You Migrate?

You should NOT migrate every Java project to Kotlin. Consider Kotlin when:

- Starting a **new microservice** in an existing Java/Spring ecosystem
- Adding new features to a project where the team wants to **gradually adopt** Kotlin
- You need **concise code** with fewer bugs (null safety, immutability by default)
- Your team values **expressiveness** (DSLs, extension functions, coroutines)

You should NOT migrate when:
- Your team has **no Kotlin experience** and ramp-up time is not acceptable
- You rely heavily on **annotation processing tools** that don't support Kotlin well
- Your codebase is **stable and low-churn** — migration effort outweighs benefits

---

## 2. Setting Up Kotlin in a Spring Boot Project

### Option A: Start a New Project with Spring Initializr

Go to [start.spring.io](https://start.spring.io), select:

- **Language**: Kotlin
- **Project**: Maven
- **Spring Boot**: 3.3.x
- **Packaging**: Jar
- **Java version**: 21

Add dependencies: Spring Web, Spring Data JPA, PostgreSQL Driver,
Spring for GraphQL, Spring for Apache Kafka, Spring Boot DevTools.

### Option B: Add Kotlin to an Existing Java Project

Add the Kotlin Maven plugin and standard library to your `pom.xml`:

```xml
<properties>
    <java.version>21</java.version>
    <kotlin.version>2.0.21</kotlin.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.jetbrains.kotlin</groupId>
        <artifactId>kotlin-stdlib</artifactId>
        <version>${kotlin.version}</version>
    </dependency>
    <dependency>
        <groupId>org.jetbrains.kotlin</groupId>
        <artifactId>kotlin-reflect</artifactId>
        <version>${kotlin.version}</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.module</groupId>
        <artifactId>jackson-module-kotlin</artifactId>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.jetbrains.kotlin</groupId>
            <artifactId>kotlin-maven-plugin</artifactId>
            <version>${kotlin.version}</version>
            <configuration>
                <compilerPlugins>
                    <plugin>spring</plugin>
                    <plugin>jpa</plugin>
                    <plugin>all-open</plugin>
                </compilerPlugins>
                <jvmTarget>21</jvmTarget>
            </configuration>
            <executions>
                <execution>
                    <id>compile</id>
                    <goals><goal>compile</goal></goals>
                    <configuration>
                        <sourceDirs>
                            <sourceDir>src/main/kotlin</sourceDir>
                            <sourceDir>src/main/java</sourceDir>
                        </sourceDirs>
                    </configuration>
                </execution>
                <execution>
                    <id>test-compile</id>
                    <goals><goal>test-compile</goal></goals>
                    <configuration>
                        <sourceDirs>
                            <sourceDir>src/test/kotlin</sourceDir>
                            <sourceDir>src/test/java</sourceDir>
                        </sourceDirs>
                    </configuration>
                </execution>
            </executions>
            <dependencies>
                <dependency>
                    <groupId>org.jetbrains.kotlin</groupId>
                    <artifactId>kotlin-maven-allopen</artifactId>
                    <version>${kotlin.version}</version>
                </dependency>
                <dependency>
                    <groupId>org.jetbrains.kotlin</groupId>
                    <artifactId>kotlin-maven-noarg</artifactId>
                    <version>${kotlin.version}</version>
                </dependency>
            </dependencies>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <executions>
                <execution>
                    <id>default-compile</id>
                    <phase>none</phase>
                </execution>
                <execution>
                    <id>default-testCompile</id>
                    <phase>none</phase>
                </execution>
                <execution>
                    <id>java-compile</id>
                    <phase>compile</phase>
                    <goals><goal>compile</goal></goals>
                </execution>
                <execution>
                    <id>java-test-compile</id>
                    <phase>test-compile</phase>
                    <goals><goal>testCompile</goal></goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### The Three Kotlin Compiler Plugins

These plugins are essential for Spring Boot + Kotlin:

1. **`spring`** (allopen) — Opens classes and methods that Spring needs to
   proxy (e.g., `@Service`, `@Configuration`, `@RestController`). Kotlin
   classes are `final` by default, but Spring creates subclass proxies via CGLIB.

2. **`jpa`** (no-arg) — Generates a synthetic no-argument constructor for
   classes annotated with `@Entity`. JPA requires this, but Kotlin classes
   don't have implicit no-arg constructors.

3. **`all-open`** — A general plugin that opens classes annotated with any
   annotation you specify. Used alongside `spring` for custom annotations.

Without these plugins, Spring Boot will **fail to start** with Kotlin.

---

## 3. Kotlin Syntax Crash Course for Java Developers

### 3.1 Hello World

**Java:**
```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

**Kotlin:**
```kotlin
fun main() {
    println("Hello, World!")
}
```

Key differences:
- No class wrapper needed — top-level `fun main()` is valid
- `System.out.println` → `println`
- No `String[] args` required (optional)

### 3.2 Variables

**Java:**
```java
String name = "Alice";           // mutable
final int age = 30;              // immutable
var city = "NYC";                // type inferred (Java 10+)
```

**Kotlin:**
```kotlin
var name: String = "Alice"       // mutable
val age: Int = 30                // immutable (preferred)
val city = "NYC"                 // type inferred
```

Kotlin uses `val` (read-only, like Java's `final`) and `var` (mutable).
**Prefer `val`** — immutability by default is a Kotlin best practice.

### 3.3 Null Safety

This is Kotlin's headline feature. In Java, any object reference can be `null`,
leading to `NullPointerException` (NPE) at runtime. Kotlin distinguishes
**nullable** and **non-nullable** types **at compile time**.

**Java:**
```java
String name = getName();      // might be null
int length = name.length();   // NPE if name is null!
```

**Kotlin:**
```kotlin
var name: String = "Alice"             // non-nullable — CANNOT be null
var nickname: String? = null           // nullable — explicitly marked with ?

// Safe call — returns null if nickname is null
val length: Int? = nickname?.length

// Elvis operator — provide a default when null
val safeLength: Int = nickname?.length ?: 0

// Not-null assertion — throws NPE if null (use sparingly!)
val forced: Int = nickname!!.length

// Smart cast — after a null check, Kotlin knows it's non-null
if (nickname != null) {
    val len: Int = nickname.length     // no ? needed — smart cast
}
```

### 3.4 String Interpolation

**Java:**
```java
String name = "Alice";
int age = 30;
String message = String.format("Hello %s, you are %d years old", name, age);
```

**Kotlin:**
```kotlin
val name = "Alice"
val age = 30
val message = "Hello $name, you are $age years old"        // simple
val complex = "Name length: ${name.length}"                 // expressions
```

### 3.5 Data Classes

Kotlin's `data class` is equivalent to Java's `record` — but with more features.

**Java (record):**
```java
public record Customer(Long id, String name, String email) {}
```

**Kotlin (data class):**
```kotlin
data class Customer(
    val id: Long,
    val name: String,
    val email: String
)
```

Both auto-generate `equals()`, `hashCode()`, `toString()`, and accessors.
Kotlin additionally provides:
- **`copy()`** — create a modified copy: `customer.copy(email = "new@email.com")`
- **`componentN()`** — destructuring: `val (id, name, _) = customer`
- **Named arguments** — `Customer(id = 1, name = "Alice", email = "a@b.com")`

### 3.6 When Expression (Kotlin's switch)

**Java (switch expression):**
```java
String label = switch (status) {
    case PENDING -> "Waiting";
    case CONFIRMED -> "Confirmed";
    case SHIPPED -> "In transit";
    case DELIVERED -> "Delivered";
    case CANCELLED -> "Cancelled";
    default -> "Unknown";
};
```

**Kotlin (when expression):**
```kotlin
val label = when (status) {
    OrderStatus.PENDING -> "Waiting"
    OrderStatus.CONFIRMED -> "Confirmed"
    OrderStatus.SHIPPED -> "In transit"
    OrderStatus.DELIVERED -> "Delivered"
    OrderStatus.CANCELLED -> "Cancelled"
}
```

Kotlin's `when` is more powerful:
- No `break` needed (branches don't fall through)
- Can match types: `when (x) { is String -> ...; is Int -> ... }`
- Can match ranges: `when (n) { in 1..10 -> ...; in 11..100 -> ... }`
- Can match conditions: `when { x > 0 -> ...; x < 0 -> ...; else -> ... }`

### 3.7 Functions

**Java:**
```java
public int add(int a, int b) {
    return a + b;
}

public int square(int n) {
    return n * n;
}
```

**Kotlin:**
```kotlin
fun add(a: Int, b: Int): Int {
    return a + b
}

// Single-expression function (concise)
fun square(n: Int): Int = n * n

// Default arguments
fun greet(name: String, greeting: String = "Hello"): String = "$greeting, $name!"

// Named arguments
greet(name = "Alice", greeting = "Hi")
greet("Bob")  // uses default greeting

// Vararg
fun sum(vararg numbers: Int): Int = numbers.sum()
sum(1, 2, 3, 4, 5)
```

### 3.8 Extension Functions

Extension functions let you add methods to existing classes **without inheritance**.

```kotlin
// Add a function to String
fun String.isEmail(): Boolean = this.contains("@") && this.contains(".")

// Add a function to BigDecimal
fun BigDecimal.toMoneyString(): String = "$${this.toPlainString()}"

// Usage
val email = "alice@example.com"
val isValid = email.isEmail()   // looks like a method on String

val price = BigDecimal("19.99")
println(price.toMoneyString())  // "$19.99"
```

This is a **superpower** — you can make any existing Java class feel like it has
new methods, without modifying the original class.

### 3.9 Collections

**Java:**
```java
List<String> names = List.of("Alice", "Bob", "Charlie");
List<String> upper = names.stream()
        .map(String::toUpperCase)
        .filter(n -> n.length() > 3)
        .toList();
```

**Kotlin:**
```kotlin
val names = listOf("Alice", "Bob", "Charlie")
val upper = names
        .map { it.uppercase() }
        .filter { it.length > 3 }

// Map and set
val orderMap = mapOf("order1" to OrderStatus.PENDING, "order2" to OrderStatus.CONFIRMED)
val prices = setOf(BigDecimal("9.99"), BigDecimal("19.99"))
```

Kotlin's collection API is richer than Java Streams:
- `mapNotNull` — map and filter nulls in one step
- `groupBy` — group into a `Map<K, List<V>>`
- `associateBy` — convert list to map by a key
- `chunked(n)` — split into chunks of size n
- `windowed(n)` — sliding window of size n

---
## 4. Migrating the Domain Layer

### 4.1 Java Entities → Kotlin Entities

JPA entities in Kotlin need the `no-arg` compiler plugin (configured in the pom.xml
above) to generate the synthetic no-argument constructor JPA requires.

**Java (from Module 04):**
```java
@Entity
@Table(name = "customers")
public class CustomerEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, unique = true)
    private String email;
    private String address;
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    protected CustomerEntity() {}

    public CustomerEntity(String name, String email, String address) {
        this.name = name;
        this.email = email;
        this.address = address;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
```

**Kotlin:**
```kotlin
@Entity
@Table(name = "customers")
class CustomerEntity(
    @Column(nullable = false, length = 100)
    var name: String,

    @Column(nullable = false, unique = true)
    var email: String,

    var address: String? = null
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null

    @Column(name = "created_at", updatable = false)
    var createdAt: Instant = Instant.now()
}
```

Key differences:
- **No explicit getters/setters** — `var` generates them automatically
- **No-arg constructor** — generated by the JPA plugin
- **Nullable `id`** — `Long?` because it's `null` until persisted
- **Constructor parameters** — Kotlin classes use primary constructors
- **`Instant.now()` as default** — runs at instantiation time

### 4.2 Java Records → Kotlin Data Classes

DTOs are even simpler in Kotlin:

**Java (record):**
```java
public record OrderResponse(
        Long id,
        String customerName,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt,
        List<OrderItemResponse> items
) {
    public static OrderResponse from(OrderEntity entity) { ... }
}
```

**Kotlin:**
```kotlin
data class OrderResponse(
    val id: Long?,
    val customerName: String,
    val status: OrderStatus,
    val totalAmount: BigDecimal,
    val createdAt: Instant,
    val items: List<OrderItemResponse>
) {
    companion object {
        fun from(entity: OrderEntity): OrderResponse = OrderResponse(
            id = entity.id,
            customerName = entity.customer.name,
            status = entity.status,
            totalAmount = entity.totalAmount,
            createdAt = entity.createdAt,
            items = entity.items.map { OrderItemResponse.from(it) }
        )
    }
}
```

The `companion object` replaces Java's `static` methods. It's a singleton object
attached to the class.

### 4.3 Java Enums → Kotlin Enums

**Java:**
```java
public enum OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}
```

**Kotlin:**
```kotlin
enum class OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}
```

Identical syntax (just `enum class` instead of `enum`).

---

## 5. Migrating Services and Controllers

### 5.1 Service Layer

**Java:**
```java
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final OrderEventProducer eventProducer;

    public OrderService(OrderRepository orderRepository,
                        OrderEventProducer eventProducer) {
        this.orderRepository = orderRepository;
        this.eventProducer = eventProducer;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {
        log.info("Creating order for customer {}", request.customerId());
        // ... business logic
    }
}
```

**Kotlin:**
```kotlin
@Service
class OrderService(
    private val orderRepository: OrderRepository,
    private val orderEventProducer: OrderEventProducer
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun createOrder(request: CreateOrderRequest): OrderResponse {
        log.info("Creating order for customer {}", request.customerId)
        // ... business logic
    }
}
```

Key differences:
- **Constructor injection via primary constructor** — parameters in the class header
- **`private val`** — Spring injects dependencies as read-only properties
- **No `this.x = x`** — Kotlin handles it automatically
- **`javaClass`** — equivalent to `OrderService::class.java`
- **`fun` keyword** — all functions start with `fun`

### 5.2 REST Controller

**Java:**
```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger log = LoggerFactory.getLogger(OrderController.class);
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(request));
    }
}
```

**Kotlin:**
```kotlin
@RestController
@RequestMapping("/api/orders")
class OrderController(
    private val orderService: OrderService
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @GetMapping("/{id}")
    fun findById(@PathVariable id: Long): ResponseEntity<OrderResponse> =
        ResponseEntity.ok(orderService.findById(id))

    @PostMapping
    fun create(@Valid @RequestBody request: CreateOrderRequest): ResponseEntity<OrderResponse> =
        ResponseEntity.status(HttpStatus.CREATED).body(orderService.createOrder(request))
}
```

---

## 6. Kotlin Coroutines — Alternative to Reactor

Spring Boot supports **Kotlin coroutines** as a simpler alternative to Reactor's
`Mono`/`Flux`. Coroutines use the `suspend` keyword and look like synchronous code
but are non-blocking under the hood.

### Mono/Flux vs Coroutines

| Reactor (Java) | Coroutines (Kotlin) |
|----------------|---------------------|
| `Mono<Order>` | `suspend fun getOrder(): Order` |
| `Flux<Order>` | `Flow<Order>` |
| `.map(it -> ...)` | direct code (synchronous-looking) |
| `.flatMap(...)` | direct code (synchronous-looking) |
| `.subscribe()` | coroutine launch (`viewModelScope { }`) |
| `StepVerifier` | direct assertions |

### Adding Coroutine Support

Add to `pom.xml`:
```xml
<dependency>
    <groupId>org.jetbrains.kotlinx</groupId>
    <artifactId>kotlinx-coroutines-core</artifactId>
    <version>1.8.1</version>
</dependency>
<dependency>
    <groupId>org.jetbrains.kotlinx</groupId>
    <artifactId>kotlinx-coroutines-reactor</artifactId>
    <version>1.8.1</version>
</dependency>
```

### Coroutine Controller Example

```kotlin
@RestController
@RequestMapping("/api/coroutine/orders")
class CoroutineOrderController(
    private val service: CoroutineOrderService
) {
    @GetMapping
    suspend fun findAll(): List<OrderResponse> =
        service.findAll()   // looks synchronous, runs non-blocking

    @GetMapping("/{id}")
    suspend fun findById(@PathVariable id: Long): OrderResponse =
        service.findById(id)   // no Mono wrapping needed

    @GetMapping("/{id}/status/stream", produces = "text/event-stream")
    fun streamStatus(@PathVariable id: Long): Flow<OrderStatus> =
        service.streamStatusUpdates(id)   // Flow replaces Flux

    @PostMapping
    suspend fun create(@Valid @RequestBody request: CreateOrderRequest): OrderResponse =
        service.createOrder(request)
}
```

### Coroutine Service Example

```kotlin
@Service
class CoroutineOrderService(
    private val orderRepository: OrderRepository
) {
    // suspending function — non-blocking but looks synchronous
    suspend fun findAll(): List<OrderResponse> =
        orderRepository.findAll().map { OrderResponse.from(it) }

    suspend fun findById(id: Long): OrderResponse =
        orderRepository.findById(id)
            ?.let { OrderResponse.from(it) }
            ?: throw IllegalArgumentException("Order not found: $id")

    @Transactional
    suspend fun createOrder(request: CreateOrderRequest): OrderResponse {
        val order = OrderEntity().apply {
            // build order
        }
        val saved = orderRepository.save(order)
        return OrderResponse.from(saved)
    }

    // Flow replaces Flux — cold stream that produces items lazily
    fun streamStatusUpdates(orderId: Long): Flow<OrderStatus> = flow {
        var current = orderRepository.findById(orderId)?.status
        while (current != OrderStatus.DELIVERED && current != OrderStatus.CANCELLED) {
            delay(1000)  // check every second
            val updated = orderRepository.findById(orderId)?.status
            if (updated != current) {
                current = updated
                emit(current!!)
            }
        }
    }
}
```

Coroutines are **dramatically simpler** than Reactor for most use cases:
- No `Mono`/`Flux` wrapping
- No operators to chain
- Stack traces are meaningful (they look like normal function calls)
- Error handling uses standard `try`/`catch`

---

## 7. Kotlin-Specific Spring Features

### 7.1 Routing DSL

Spring Boot provides a Kotlin DSL for defining routes (alternative to annotations):

```kotlin
@Configuration
class RoutesConfig {
    @Bean
    fun apiRoutes(controller: OrderController) = router {
        "/api/orders".nest {
            GET("/", controller::findAll)
            GET("/{id}", controller::findById)
            POST("/", controller::create)
            PUT("/{id}/status", controller::updateStatus)
        }
    }
}
```

### 7.2 Bean DSL

Spring Boot supports a Kotlin DSL for bean configuration:

```kotlin
@Configuration
class AppConfig {
    @Bean
    fun objectMapper() = jacksonObjectMapper()
        .registerModule(JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

    @Bean
    fun kafkaTemplate(cf: ConnectionFactory) = KafkaTemplate(cf)
}
```

### 7.3 Kotlin JPA Repositories

Spring Data JPA works identically in Kotlin:

```kotlin
@Repository
interface OrderRepository : JpaRepository<OrderEntity, Long> {
    fun findByStatus(status: OrderStatus): List<OrderEntity>
    fun findByCustomerId(customerId: Long): List<OrderEntity>
}
```

For reactive R2DBC:
```kotlin
interface ReactiveOrderRepository : R2dbcRepository<OrderEntity, Long> {
    fun findByStatus(status: OrderStatus): Flow<OrderEntity>
    suspend fun findById(id: Long): OrderEntity?
}
```

Note: With coroutines, Spring Data returns `Flow<T>` instead of `Flux<T>` and
`suspend` functions instead of `Mono<T>`.

---

## 8. IntelliJ IDEA's Java-to-Kotlin Converter (J2K)

IntelliJ IDEA (Community or Ultimate) ships with a **Java to Kotlin converter**
(J2K) that automatically converts Java files to Kotlin.

### How to Use It

1. Open your Java file in IntelliJ
2. Select all code (Ctrl/Cmd+A)
3. Code → Convert Java File to Kotlin File (Ctrl/Cmd+Shift+Alt+K)
4. IntelliJ generates equivalent Kotlin code

### What J2K Handles Well

- Class → class with primary constructor
- Getters/setters → `var`/`val` properties
- `if-else` chains → `when` expressions (sometimes)
- `for` loops → `for` or `forEach`
- Static methods → `companion object`

### What J2K Does NOT Handle

- Fluent builder patterns (leaves them as Java-style chains)
- Stream API (doesn't always convert to Kotlin collection functions)
- Lombok annotations (must be removed first)
- Field injection (leaves `@Autowired` on fields — must be converted to constructor injection)
- Java records (sometimes generates verbose Kotlin instead of `data class`)

### Migration Strategy

1. **Start with DTOs** — Convert records to `data class` (simplest, no behavior)
2. **Convert enums** — Trivial, nearly identical syntax
3. **Convert entities** — JPA entities need the `jpa` plugin (already configured)
4. **Convert controllers** — Simple, mostly annotation-driven
5. **Convert services** — More logic, requires careful review
6. **Convert repositories** — Just interfaces, trivial
7. **Convert tests last** — Tests should validate the migration

### Mixed Java/Kotlin

You can have **both Java and Kotlin files in the same project**. This lets you
migrate incrementally — one file at a time, one module at a time. The Kotlin
compiler compiles both languages together.

---

## 9. Testing Kotlin Code

### 9.1 JUnit 5 with Kotlin

JUnit 5 works with Kotlin out of the box:

```kotlin
package com.example.ordermgmt.service

import com.example.ordermgmt.domain.*
import com.example.ordermgmt.dto.*
import com.example.ordermgmt.repository.*
import com.example.ordermgmt.kafka.OrderEventProducer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.*

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
        // Arrange
        val customer = CustomerEntity("Alice", "alice@example.com", "123 Main")
        customer.id = 1L

        val product = ProductEntity("Mug", BigDecimal("12.99"), 100, "Kitchen")
        product.id = 10L

        whenever(customerRepository.findById(1L)).thenReturn(Optional.of(customer))
        whenever(productRepository.findById(10L)).thenReturn(Optional.of(product))
        whenever(orderRepository.save(any())).thenAnswer { invocation ->
            val order = invocation.getArgument<OrderEntity>(0)
            order.id = 100L
            order
        }

        val request = CreateOrderRequest(1L, listOf(CreateOrderItemRequest(10L, 3)))

        // Act
        val response = orderService.createOrder(request)

        // Assert
        assertEquals("Alice", response.customerName)
        assertEquals(OrderStatus.PENDING, response.status)
        assertEquals(1, response.items.size)
        verify(orderRepository).save(any())
        verify(eventProducer).publishOrderCreated(any())
    }

    @Test
    fun `findById with nonexistent id throws exception`() {
        whenever(orderRepository.findById(999L)).thenReturn(Optional.empty())

        assertThrows<OrderNotFoundException> {
            orderService.findById(999L)
        }
    }
}
```

### 9.2 Key Testing Differences

| Java | Kotlin |
|------|--------|
| `@Mock private OrderRepository repo;` | `@Mock private lateinit var repo: OrderRepository` |
| `when(repo.findById(1L)).thenReturn(...)` | `whenever(repo.findById(1L)).thenReturn(...)` |
| `verify(repo).save(any())` | `verify(repo).save(any())` (same) |
| `assertThat(result).isEqualTo(expected)` | assertEquals(expected, result) (or use AssertJ) |
| `assertThrows(Exception.class, () -> ...)` | `assertThrows<Exception> { ... }` |

The `mockito-kotlin` library (`org.mockito.kotlin`) provides Kotlin-friendly
wrappers. Add it to your pom.xml:

```xml
<dependency>
    <groupId>org.mockito.kotlin</groupId>
    <artifactId>mockito-kotlin</artifactId>
    <version>5.4.0</version>
    <scope>test</scope>
</dependency>
```

### 9.3 Testing Coroutines with `runTest`

For coroutine tests, use `kotlinx-coroutines-test`. Add it to your `pom.xml`:

```xml
<dependency>
    <groupId>org.jetbrains.kotlinx</groupId>
    <artifactId>kotlinx-coroutines-test</artifactId>
    <version>1.8.1</version>
    <scope>test</scope>
</dependency>
```

Then use `runTest` to test `suspend` functions:

```kotlin
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test

class CoroutineOrderServiceTest {

    @Test
    fun `findAll returns all orders`() = runTest {
        // Arrange
        val service = CoroutineOrderService(mockRepository)

        // Act
        val result = service.findAll()

        // Assert
        assertEquals(3, result.size)
    }
}
```

---

## What You Learned

- **Kotlin** is a JVM language fully interoperable with Java — you can mix both in one project
- **Null safety** is Kotlin's headline feature — nullable types are explicit and checked at compile time
- **Data classes** replace Java records and provide `copy()`, destructuring, and named arguments
- **`when`** expressions are more powerful than Java's `switch`
- **Extension functions** let you add methods to any class without inheritance
- **Constructor injection** is even cleaner in Kotlin — dependencies go in the primary constructor header
- **Kotlin coroutines** offer a simpler alternative to Reactor's Mono/Flux — `suspend` functions look synchronous
- **`Flow<T>`** replaces `Flux<T>` for cold streams in coroutine-based Spring WebFlux
- **Spring Boot** has first-class Kotlin support with compiler plugins (`spring`, `jpa`, `all-open`)
- **IntelliJ's J2K converter** automates most of the migration, but manual review is essential
- **Testing** uses the same JUnit 5 + Mockito stack, with `mockito-kotlin` for Kotlin-friendly syntax
- **Migration strategy**: DTOs first, then entities, controllers, services, repositories, tests last

---
---
