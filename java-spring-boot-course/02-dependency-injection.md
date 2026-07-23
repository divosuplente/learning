# Module 02: Dependency Injection

## What You'll Learn

- The problem that dependency injection solves: tight coupling with the `new` keyword
- What dependency injection (DI) is and how it works
- Inversion of Control (IoC) and the Hollywood Principle
- The Spring IoC container: beans and application context
- Types of injection: constructor, setter, and field injection
- Why constructor injection is preferred
- Spring stereotype annotations: `@Component`, `@Service`, `@Repository`, `@Controller`
- `@Autowired`: what it does and why constructor injection doesn't need it
- Bean scopes: singleton, prototype, request, session
- Manual bean creation with `@Configuration` and `@Bean`
- Resolving ambiguous dependencies with `@Qualifier` and `@Primary`
- Circular dependencies and how to avoid them
- Life-cycle hooks: `@PostConstruct` and `@PreDestroy`
- Wiring the Order Management domain using Spring DI

## Prerequisites

- [Module 00: Java for Experienced Developers](./00-java-foundations.md) — you understand Java classes, records, interfaces, constructors
- [Module 01: Build Tools & Project Setup](./01-build-tools-and-project-setup.md) — you have a working Spring Boot project with `application.yml`
- No prior experience with Spring or dependency injection required

---

<details>
<summary>Table of Contents</summary>

- [What You'll Learn](#what-youll-learn)
- [Prerequisites](#prerequisites)
- [1. The Problem: Tight Coupling with new](#1-the-problem-tight-coupling-with-new)
  - [Example: The Bad Way](#example-the-bad-way)
  - [Why Is This Bad?](#why-is-this-bad)
  - [The Fix: Dependency Injection](#the-fix-dependency-injection)
- [2. What Is Dependency Injection?](#2-what-is-dependency-injection)
  - [The Restaurant Analogy](#the-restaurant-analogy)
- [3. Inversion of Control (IoC)](#3-inversion-of-control-ioc)
  - [The Hollywood Principle](#the-hollywood-principle)
- [4. The Spring IoC Container](#4-the-spring-ioc-container)
  - [Key Terms](#key-terms)
- [5. Types of Injection](#5-types-of-injection)
  - [1. Constructor Injection (Preferred)](#1-constructor-injection-preferred)
  - [2. Setter Injection (Rarely Used)](#2-setter-injection-rarely-used)
  - [3. Field Injection (Avoid)](#3-field-injection-avoid)
  - [Why Constructor Injection Is Preferred](#why-constructor-injection-is-preferred)
- [6. Spring Stereotype Annotations](#6-spring-stereotype-annotations)
  - [How Component Scanning Works](#how-component-scanning-works)
  - [Example: Creating Beans](#example-creating-beans)
- [7. @Autowired: Explicit vs. Implicit Wiring](#7-autowired-explicit-vs-implicit-wiring)
- [8. Bean Scopes](#8-bean-scopes)
  - [Setting a Scope](#setting-a-scope)
- [9. Manual Bean Creation with @Configuration and @Bean](#9-manual-bean-creation-with-configuration-and-bean)
  - [When to Use @Bean vs @Component](#when-to-use-bean-vs-component)
- [10. Resolving Ambiguous Dependencies: @Qualifier and @Primary](#10-resolving-ambiguous-dependencies-qualifier-and-primary)
  - [Using @Qualifier for Specific Selection](#using-qualifier-for-specific-selection)
- [11. Circular Dependencies](#11-circular-dependencies)
  - [How to Avoid Circular Dependencies](#how-to-avoid-circular-dependencies)
- [12. Life-Cycle Hooks: @PostConstruct and @PreDestroy](#12-life-cycle-hooks-postconstruct-and-predestroy)
  - [When to Use Each](#when-to-use-each)
- [13. Wiring the Order Management Domain](#13-wiring-the-order-management-domain)
  - [Domain Records (from Module 00)](#domain-records-from-module-00)
  - [Repository Interfaces (stubs — real JPA in Module 04)](#repository-interfaces-stubs-real-jpa-in-module-04)
  - [Service Layer](#service-layer)
  - [Controller](#controller)
  - [The Application Entry Point](#the-application-entry-point)
  - [How Spring Wires Everything](#how-spring-wires-everything)
- [What You Learned](#what-you-learned)
- [12. Bean Lifecycle Callbacks in Depth](#12-bean-lifecycle-callbacks-in-depth)
  - [The Bean Lifecycle (Simplified)](#the-bean-lifecycle-simplified)
  - [@PostConstruct and @PreDestroy](#postconstruct-and-predestroy)
  - [When to Use Each](#when-to-use-each)
- [13. Conditional Bean Registration](#13-conditional-bean-registration)
  - [@ConditionalOnProperty](#conditionalonproperty)
  - [@ConditionalOnMissingBean](#conditionalonmissingbean)
  - [@ConditionalOnClass](#conditionalonclass)
  - [Combining Conditions](#combining-conditions)
- [14. Bean Scopes in Practice](#14-bean-scopes-in-practice)
  - [The Proxy Problem](#the-proxy-problem)
- [15. Spring Bean Circular Dependencies](#15-spring-bean-circular-dependencies)
  - [The Problem](#the-problem)
  - [Solution 1: Redesign (Preferred)](#solution-1-redesign-preferred)
  - [Solution 2: Use Events](#solution-2-use-events)
- [16. Spring AOP (Aspect-Oriented Programming)](#16-spring-aop-aspect-oriented-programming)
  - [How Spring Uses AOP Internally](#how-spring-uses-aop-internally)
  - [Custom Aspect Example: Method Timing](#custom-aspect-example-method-timing)
- [17. Spring Profiles and Environment Abstraction](#17-spring-profiles-and-environment-abstraction)
  - [@Value with SpEL (Spring Expression Language)](#value-with-spel-spring-expression-language)
- [Recommended YouTube Videos](#recommended-youtube-videos)

</details>

## 1. The Problem: Tight Coupling with `new`

When a class creates its own dependencies using the `new` keyword, it becomes **tightly coupled** — it can't function without those specific implementations.

### Example: The Bad Way

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.Customer;
import com.example.ordermgmt.repository.CustomerRepository;
import com.example.ordermgmt.repository.OrderRepository;
import com.example.ordermgmt.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    // BAD: OrderService creates its own dependencies with `new`
    public OrderService() {
        this.customerRepository = new CustomerRepository();  // hard-coded!
        this.productRepository = new ProductRepository();    // hard-coded!
        this.orderRepository = new OrderRepository();        // hard-coded!
    }

    public Customer findCustomer(Long id) {
        return customerRepository.findById(id);
    }
}
```

### Why Is This Bad?

1. **Tight coupling** — `OrderService` is permanently bound to these specific repository implementations. You can't swap them without rewriting `OrderService`.
2. **Hard to test** — In a unit test, you can't replace the real repositories with mocks (fake versions). You'd need a real database to test `findCustomer()`.
3. **Hidden dependencies** — Someone who calls `new OrderService()` has no idea it needs three repositories. The dependencies are hidden inside the constructor.
4. **No flexibility** — If you later need a different `CustomerRepository` (e.g., one that caches results), you'd have to change `OrderService` itself.

### The Fix: Dependency Injection

Instead of `OrderService` creating its own dependencies, it **receives** them from outside:

```java
// GOOD: OrderService receives its dependencies through the constructor
public class OrderService {

    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    // Dependencies are passed in — not created here
    public OrderService(
            CustomerRepository customerRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }
}
```

Now `OrderService` doesn't know or care **how** the repositories are created. It just declares "I need these three things" and someone else provides them. This is **dependency injection**.

---

## 2. What Is Dependency Injection?

**Dependency Injection (DI)** is a design pattern where an object receives its dependencies from an external source instead of creating them itself.

### The Restaurant Analogy

Think of a restaurant kitchen:

- **Without DI:** The kitchen grows its own tomatoes, raises its own chickens, and bakes its own bread. If the tomato crop fails, the kitchen can't make any tomato dishes.
- **With DI:** A supplier delivers tomatoes, chicken, and bread to the kitchen every morning. The kitchen doesn't care how the tomatoes were grown — it just uses them. If one supplier is unreliable, you switch to a different one without changing the kitchen.

In software:
- The **kitchen** is your class (e.g., `OrderService`)
- The **ingredients** are dependencies (e.g., `CustomerRepository`)
- The **supplier** is the Spring IoC container — it creates objects and delivers them to your classes

---

## 3. Inversion of Control (IoC)

**Inversion of Control (IoC)** is the broader principle behind DI. It means that the control over creating and managing objects is **inverted** — moved from your code to a framework or container.

### The Hollywood Principle

IoC is sometimes called the **Hollywood Principle**: *"Don't call us, we'll call you."*

In traditional programming, your code calls the framework. In IoC, the framework calls your code. You don't go looking for your dependencies — the container pushes them to you.

| Traditional (no IoC) | With IoC |
|----------------------|----------|
| `OrderService` calls `new CustomerRepository()` | Spring creates `CustomerRepository` and gives it to `OrderService` |
| Your code controls object creation | The container controls object creation |
| Your code knows about concrete implementations | Your code only knows about interfaces/types |

---

## 4. The Spring IoC Container

The **Spring IoC container** is the "supplier" in our restaurant analogy. It:

1. Discovers all components (classes annotated with `@Component`, `@Service`, etc.)
2. Creates instances of them (beans)
3. Figures out which beans depend on which other beans
4. Injects the dependencies

### Key Terms

| Term | Meaning |
|------|---------|
| **Bean** | A Java object managed by the Spring container. Any object that Spring creates and can inject is a bean. |
| **Application Context** | The Spring container itself. It's the registry of all beans in your application. |
| **Wiring** | The process of connecting beans to their dependencies. Spring does this automatically. |

---

## 5. Types of Injection

There are three ways to inject dependencies into a class:

### 1. Constructor Injection (Preferred)

Dependencies are passed through the constructor:

```java
@Service
public class OrderService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;

    // Spring calls this constructor and passes the dependencies
    public OrderService(
            CustomerRepository customerRepository,
            OrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
    }
}
```

**Pros:**
- Dependencies are `final` (immutable) — can't be changed after construction
- You can't create an `OrderService` without its dependencies — the compiler enforces it
- Easy to test — just pass mocks to the constructor in tests
- Spring doesn't need `@Autowired` — if a class has one constructor, Spring uses it automatically

### 2. Setter Injection (Rarely Used)

Dependencies are set via setter methods:

```java
@Service
public class OrderService {

    private CustomerRepository customerRepository;

    @Autowired
    public void setCustomerRepository(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }
}
```

**Cons:** The dependency can be changed at any time (not `final`), and you can create an `OrderService` in an invalid state (without its dependencies).

### 3. Field Injection (Avoid)

Dependencies are injected directly into fields:

```java
@Service
public class OrderService {

    @Autowired  // BAD — avoid this
    private CustomerRepository customerRepository;
}
```

**Cons:** The field can't be `final` (so it's mutable), you can't test without Spring (you'd need reflection to set the field), and it hides dependencies from the constructor signature.

### Why Constructor Injection Is Preferred

| Feature | Constructor | Setter | Field |
|---------|-------------|--------|-------|
| Immutable (`final`) | Yes | No | No |
| Testable without Spring | Yes | Yes | No |
| Compile-time safety | Yes | No | No |
| Clear dependencies | Yes | No | No |

**Rule: Always use constructor injection. Never use `@Autowired` on fields.**

---

## 6. Spring Stereotype Annotations

Spring uses **stereotype annotations** to mark classes as beans. When Spring starts, it scans your packages and finds all annotated classes:

| Annotation | Purpose | When to Use |
|------------|---------|-------------|
| `@Component` | Generic Spring bean | When no specific stereotype fits |
| `@Service` | Business logic | For service classes (e.g., `OrderService`) |
| `@Repository` | Data access | For repository classes (e.g., `OrderRepository`) |
| `@Controller` | Web requests | For REST controllers (or `@RestController`) |

Functionally, these annotations are almost identical — they all register the class as a Spring bean. The different names are for **semantic clarity** — they communicate the role of the class.

### How Component Scanning Works

Remember from Module 01, the `@SpringBootApplication` annotation includes `@ComponentScan`. This tells Spring:

1. Look in the package `com.example.ordermgmt` and all sub-packages
2. Find every class annotated with `@Component`, `@Service`, `@Repository`, `@Controller`, `@Configuration`
3. Create a bean (instance) for each
4. Wire the beans together based on their constructor parameters

### Example: Creating Beans

```java
// Spring finds this and creates a bean of type CustomerService
@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    // Spring sees this constructor and finds a CustomerRepository bean to inject
    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public Customer getCustomer(Long id) {
        return customerRepository.findById(id);
    }
}
```

---

## 7. `@Autowired`: Explicit vs. Implicit Wiring

The `@Autowired` annotation tells Spring to inject a dependency. But with constructor injection, it's **optional**:

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    // @Autowired is OPTIONAL here — Spring auto-detects single constructors
    // You can include it for clarity, but it's not required
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

Spring's rule: if a class has exactly one constructor, Spring uses it automatically — no `@Autowired` needed.

You only need `@Autowired` when:
- A class has multiple constructors (rare — usually a code smell)
- Using setter or field injection (which we avoid)

---

## 8. Bean Scopes

A bean's **scope** determines how and when Spring creates instances:

| Scope | What It Means | When to Use |
|-------|---------------|-------------|
| **singleton** (default) | One instance shared across the entire application | Most beans — services, repositories, controllers |
| **prototype** | A new instance created every time it's requested | When each user needs their own instance |
| **request** | One instance per HTTP request | Web-specific beans |
| **session** | One instance per HTTP session | User-specific beans |

### Setting a Scope

```java
@Service
@Scope("prototype")  // A new instance every time it's injected
public class OrderCalculator {
    // Each injection gets a fresh instance
}
```

Without `@Scope`, the default is **singleton** — one instance shared by everything. This is almost always what you want for services and repositories.

**Important:** With singleton scope, your beans must be **stateless** — they should not store data in instance fields (except constants and injected dependencies). If multiple threads access a singleton bean simultaneously and it has mutable state, you'll get race conditions.

---

## 9. Manual Bean Creation with `@Configuration` and `@Bean`

Sometimes you can't use stereotype annotations. For example, when you need to create a bean from a third-party library (you can't add `@Service` to a class you didn't write).

Use `@Configuration` classes with `@Bean` methods:

```java
package com.example.ordermgmt.config;

import com.example.ordermgmt.service.OrderCalculator;
import com.example.ordermgmt.service.DiscountService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    // @Bean tells Spring: "call this method and register the result as a bean"
    @Bean
    public OrderCalculator orderCalculator(DiscountService discountService) {
        // You can add custom logic here
        OrderCalculator calculator = new OrderCalculator(discountService);
        calculator.setPrecision(2);  // Custom configuration
        return calculator;
    }
}
```

### When to Use `@Bean` vs `@Component`

| Approach | When to Use |
|----------|-------------|
| `@Component` / `@Service` | You wrote the class and can annotate it |
| `@Bean` in `@Configuration` | You're using a third-party class you can't annotate |

---

## 10. Resolving Ambiguous Dependencies: `@Qualifier` and `@Primary`

Sometimes you have multiple beans of the same type. For example, two `CustomerRepository` implementations (one for PostgreSQL, one for in-memory testing):

```java
@Configuration
public class AppConfig {

    @Bean
    @Primary  // This is the default choice when ambiguous
    public CustomerRepository postgresCustomerRepository(DataSource dataSource) {
        return new JpaCustomerRepository(dataSource);
    }

    @Bean
    public CustomerRepository inMemoryCustomerRepository() {
        return new InMemoryCustomerRepository();
    }
}
```

When `OrderService` asks for a `CustomerRepository`, Spring sees two options. `@Primary` tells it to use the PostgreSQL one by default.

### Using `@Qualifier` for Specific Selection

If you want a specific bean (not the primary one), use `@Qualifier`:

```java
@Service
public class TestOrderService {

    // Explicitly request the in-memory repository
    public TestOrderService(
            @Qualifier("inMemoryCustomerRepository")
            CustomerRepository customerRepository) {
        // Gets the in-memory version, not the primary one
    }
}
```

---

## 11. Circular Dependencies

A **circular dependency** happens when two beans depend on each other:

```
OrderService → needs → CustomerService → needs → OrderService → ...
```

Spring cannot create either bean because it can't finish constructing one without the other.

### How to Avoid Circular Dependencies

The solution is usually a **design change**: if `OrderService` and `CustomerService` need to call each other, they're probably doing too much. Split the responsibility:

```java
// BAD: circular dependency
@Service
public class OrderService {
    public OrderService(CustomerService customerService) { ... }
}

@Service
public class CustomerService {
    public CustomerService(OrderService orderService) { ... }  // circular!
}

// GOOD: extract the shared logic into a third service
@Service
public class OrderService {
    // Only depends on the shared service, not on CustomerService
    public OrderService(SharedLookupService sharedService) { ... }
}

@Service
public class CustomerService {
    public CustomerService(SharedLookupService sharedService) { ... }
}

@Service
public class SharedLookupService {
    // This service contains the logic both needed
}
```

---

## 12. Life-Cycle Hooks: `@PostConstruct` and `@PreDestroy`

Spring lets you run code at specific points in a bean's life cycle:

```java
package com.example.ordermgmt.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
        log.info("constructor called — dependencies injected");
    }

    @PostConstruct
    public void init() {
        // Runs AFTER the constructor, AFTER all dependencies are injected
        // Use for: opening connections, loading cached data, validation
        log.info("post_construct — initialization complete");
    }

    @PreDestroy
    public void cleanup() {
        // Runs BEFORE the bean is destroyed (when the application shuts down)
        // Use for: closing connections, flushing buffers
        log.info("pre_destroy — cleaning up resources");
    }
}
```

### When to Use Each

| Hook | When It Runs | Use For |
|------|-------------|---------|
| Constructor | When Spring creates the bean | Storing injected dependencies (always) |
| `@PostConstruct` | After construction and injection | Initialization logic (opening connections, loading caches) |
| `@PreDestroy` | Before the bean is destroyed | Cleanup logic (closing connections, saving state) |

Note: `@PostConstruct` and `@PreDestroy` come from `jakarta.annotation` (not `javax.annotation`) in Spring Boot 3.x.

---

## 13. Wiring the Order Management Domain

Let's wire our entire domain using Spring DI. Here's how it fits together:

```
OrderController
    depends on → OrderService
        depends on → OrderRepository
        depends on → ProductRepository
        depends on → CustomerRepository
```

### Domain Records (from Module 00)

```java
package com.example.ordermgmt.domain;

import java.math.BigDecimal;
import java.time.Instant;

public record Customer(Long id, String name, String email, String address) {}

public record Product(Long id, String name, BigDecimal price, int stock, String category) {}

public record OrderItem(Long id, Product product, int quantity, BigDecimal unitPrice) {}

public record Order(
        Long id,
        Customer customer,
        java.util.List<OrderItem> items,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt
) {}

public enum OrderStatus {
    PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
}
```

### Repository Interfaces (stubs — real JPA in Module 04)

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.Customer;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class CustomerRepository {
    private final Map<Long, Customer> store = new HashMap<>();

    public Customer save(Customer customer) {
        store.put(customer.id(), customer);
        return customer;
    }

    public Optional<Customer> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    public List<Customer> findAll() {
        return new ArrayList<>(store.values());
    }
}
```

### Service Layer

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.*;
import com.example.ordermgmt.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    // Constructor injection — Spring wires everything automatically
    public OrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
    }

    public Order createOrder(Long customerId, List<OrderItem> items) {
        log.info("create_order customerId={}", customerId);

        // Verify the customer exists
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found: " + customerId));

        // Calculate total
        BigDecimal total = items.stream()
                .map(item -> item.unitPrice().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Create the order
        Order order = new Order(
                null,
                customer,
                items,
                OrderStatus.PENDING,
                total,
                java.time.Instant.now()
        );

        Order saved = orderRepository.save(order);
        log.info("order_created orderId={} total={}", saved.id(), total);
        return saved;
    }
}
```

### Controller

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.domain.Order;
import com.example.ordermgmt.service.OrderService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    // Constructor injection
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public Order createOrder(@RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request.customerId(), request.items());
    }
}
```

### The Application Entry Point

This was created by Spring Initializr in Module 01:

```java
package com.example.ordermgmt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OrderManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderManagementApplication.class, args);
    }
}
```

### How Spring Wires Everything

When you start the application:

1. Spring scans `com.example.ordermgmt.*` for annotated classes
2. It finds `CustomerRepository`, `ProductRepository`, `OrderRepository` (all `@Repository`)
3. It finds `OrderService` (`@Service`) — sees its constructor needs three repositories — creates those first
4. It finds `OrderController` (`@RestController`) — sees it needs `OrderService` — already created
5. All beans are registered in the application context, ready to use

**You didn't write a single `new` statement for any of these objects.** Spring created and connected them all automatically.

---

## What You Learned

- **Tight coupling** with `new` makes code hard to test, modify, and maintain — dependency injection solves this by receiving dependencies from outside
- **Dependency Injection (DI)** means objects receive their dependencies instead of creating them — like a restaurant receiving ingredients from a supplier instead of growing its own
- **Inversion of Control (IoC)** inverts the responsibility of object creation from your code to the Spring container
- A **bean** is a Java object managed by the Spring container; the **application context** is the registry of all beans
- **Constructor injection** is preferred over setter and field injection because it makes dependencies `final`, clear, and testable
- Spring **stereotype annotations** (`@Service`, `@Repository`, `@Controller`, `@Component`) mark classes as beans for Spring to discover
- `@Autowired` is optional with constructor injection — Spring auto-detects single constructors
- **Bean scopes**: singleton (default, one shared instance) vs prototype (new instance each time)
- `@Configuration` with `@Bean` methods creates beans for classes you can't annotate directly
- `@Primary` and `@Qualifier` resolve ambiguous dependencies when multiple beans of the same type exist
- **Circular dependencies** are caused by two beans depending on each other — fix by extracting shared logic into a third service
- `@PostConstruct` and `@PreDestroy` (from `jakarta.annotation`) hook into the bean life cycle for initialization and cleanup

---

## 12. Bean Lifecycle Callbacks in Depth

Spring beans go through a well-defined lifecycle. Understanding it helps you
hook into the right phase for initialization and cleanup.

### The Bean Lifecycle (Simplified)

```
1. Instantiation — Spring creates the bean instance (constructor)
2. Property injection — Spring sets dependencies (@Autowired)
3. BeanNameAware.setBeanName()
4. BeanFactoryAware.setBeanFactory()
5. ApplicationContextAware.setApplicationContext()
6. @PostConstruct — custom initialization
7. InitializingBean.afterPropertiesSet()
8. Custom init method (@Bean(initMethod = "..."))
9. Bean is ready for use
--- (bean lives and serves requests) ---
10. @PreDestroy — custom cleanup
11. DisposableBean.destroy()
12. Custom destroy method (@Bean(destroyMethod = "..."))
```

### @PostConstruct and @PreDestroy

```java
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

@Service
public class OrderService {

    private final OrderRepository orderRepo;
    private ConnectionPool connectionPool;

    public OrderService(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }

    @PostConstruct
    public void init() {
        // Called after all dependencies are injected
        // Safe to use injected fields here
        log.info("OrderService initialized");
        this.connectionPool = new ConnectionPool(10);
    }

    @PreDestroy
    public void cleanup() {
        // Called before the bean is destroyed
        log.info("OrderService shutting down...");
        connectionPool.close();
    }
}
```

### When to Use Each

| Mechanism | When to Use |
|-----------|-------------|
| Constructor | Initialize final fields with dependencies (preferred) |
| `@PostConstruct` | Initialize resources that depend on injected beans |
| `afterPropertiesSet()` | Legacy code, prefer `@PostConstruct` |
| `@PreDestroy` | Close connections, flush buffers, release resources |
| `destroy()` | Legacy code, prefer `@PreDestroy` |

---

## 13. Conditional Bean Registration

Spring Boot's auto-configuration is built on **conditional beans** — beans that are
only created when specific conditions are met.

### @ConditionalOnProperty

```java
@Configuration
public class FeatureConfig {

    @Bean
    @ConditionalOnProperty(name = "ordermgmt.audit.enabled", havingValue = "true")
    public OrderAuditService orderAuditService() {
        return new OrderAuditService();
    }
}
```

```yaml
# application.yml
ordermgmt:
  audit:
    enabled: true  # set to false to disable the audit bean
```

### @ConditionalOnMissingBean

```java
@Bean
@ConditionalOnMissingBean(OrderRepository.class)
public OrderRepository defaultOrderRepository() {
    // Only created if no other OrderRepository bean exists
    return new InMemoryOrderRepository();
}
```

### @ConditionalOnClass

```java
@Configuration
@ConditionalOnClass(name = "org.postgresql.ds.PGSimpleDataSource")
public class PostgresAutoConfig {
    // Only active when PostgreSQL driver is on the classpath
    @Bean
    public DataSource postgresDataSource() {
        return new HikariDataSource();
    }
}
```

### Combining Conditions

```java
@Bean
@ConditionalOnProperty(name = "ordermgmt.cache.type", havingValue = "redis")
@ConditionalOnClass(name = "redis.clients.jedis.Jedis")
@ConditionalOnMissingBean(CacheManager.class)
public CacheManager redisCacheManager() {
    return new RedisCacheManager();
}
```

---

## 14. Bean Scopes in Practice

| Scope | Lifecycle | Use Case |
|-------|-----------|----------|
| `singleton` (default) | One instance for the entire application | Stateless services, repositories, configs |
| `prototype` | New instance every time it's injected | Stateful objects, DTO builders |
| `request` | One per HTTP request (web only) | Per-request context (user info, trace ID) |
| `session` | One per HTTP session (web only) | Shopping cart, user preferences |
| `application` | One per ServletContext | Application-wide state |

```java
@Component
@Scope("prototype")
public class OrderBuilder {
    // Each injection gets a fresh instance
    private OrderEntity order = new OrderEntity();

    public OrderBuilder withCustomer(CustomerEntity customer) {
        order.setCustomer(customer);
        return this;
    }

    public OrderEntity build() {
        var built = order;
        order = new OrderEntity();  // reset for next build
        return built;
    }
}
```

### The Proxy Problem

When a singleton injects a prototype, Spring creates the prototype **once** at
injection time — not on every use. To get a fresh prototype each time:

```java
@Service
public class OrderService {
    private final ObjectProvider<OrderBuilder> builderProvider;

    public OrderService(ObjectProvider<OrderBuilder> builderProvider) {
        this.builderProvider = builderProvider;
    }

    public OrderEntity createOrder() {
        // getObject() returns a fresh prototype each time
        OrderBuilder builder = builderProvider.getObject();
        return builder.withCustomer(customer).build();
    }
}
```

---

## 15. Spring Bean Circular Dependencies

A **circular dependency** occurs when Bean A depends on Bean B, and Bean B
depends on Bean A. Spring detects this and throws an error by default.

### The Problem

```java
@Service
public class OrderService {
    private final CustomerService customerService;

    public OrderService(CustomerService customerService) {
        this.customerService = customerService;  // needs CustomerService
    }
}

@Service
public class CustomerService {
    private final OrderService orderService;

    public CustomerService(OrderService orderService) {
        this.orderService = orderService;  // needs OrderService
    }
}
// Spring fails: "The dependencies of some of the beans form a cycle"
```

### Solution 1: Redesign (Preferred)

Extract the shared logic into a third service that both depend on:

```java
@Service
public class OrderLookupService {
    // shared logic that both OrderService and CustomerService need
    public boolean hasActiveOrders(Long customerId) { ... }
}

@Service
public class OrderService {
    private final OrderLookupService lookup;  // no cycle
    public OrderService(OrderLookupService lookup) { this.lookup = lookup; }
}

@Service
public class CustomerService {
    private final OrderLookupService lookup;  // no cycle
    public CustomerService(OrderLookupService lookup) { this.lookup = lookup; }
}
```

### Solution 2: Use Events

Instead of A calling B, A publishes an event that B listens to:

```java
@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public void createOrder(CreateOrderRequest request) {
        // ... create order ...
        publisher.publishEvent(new OrderCreatedEvent(order.getId()));
        // No direct dependency on CustomerService
    }
}

@Service
public class CustomerService {
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        // React to the event instead of being called directly
    }
}
```

---

## 16. Spring AOP (Aspect-Oriented Programming)

**AOP** lets you add cross-cutting concerns (logging, timing, security) without
modifying business code.

### How Spring Uses AOP Internally

Spring uses AOP to implement:
- `@Transactional` — wraps methods in transaction begin/commit/rollback
- `@Async` — runs methods on a separate thread
- `@Cacheable` — intercepts method calls to check cache first
- `@Secured` / `@PreAuthorize` — checks permissions before method execution

### Custom Aspect Example: Method Timing

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.slf4j.*;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Aspect
@Component
public class MethodTimerAspect {

    private static final Logger log = LoggerFactory.getLogger(MethodTimerAspect.class);

    // Pointcut: all methods in the service package
    @Around("execution(* com.example.ordermgmt.service..*(..))")
    public Object timeMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        long start = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();  // execute the actual method
            long duration = System.currentTimeMillis() - start;
            log.info("{} executed in {}ms", methodName, duration);
            return result;
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            log.error("{} failed after {}ms: {}", methodName, duration, e.getMessage());
            throw e;
        }
    }
}
```

Every method in `com.example.ordermgmt.service` now gets automatic timing without any
code changes to those methods.

---

## 17. Spring Profiles and Environment Abstraction

The `Environment` abstraction lets you access configuration values programmatically:

```java
@Service
public class FeatureFlagService {

    private final Environment env;

    public FeatureFlagService(Environment env) {
        this.env = env;
    }

    public boolean isFeatureEnabled(String feature) {
        return env.getProperty("ordermgmt.features." + feature, Boolean.class, false);
    }

    public String getActiveProfile() {
        String[] profiles = env.getActiveProfiles();
        return profiles.length > 0 ? profiles[0] : "default";
    }
}
```

### @Value with SpEL (Spring Expression Language)

```java
@Service
public class OrderService {

    // Simple property
    @Value("${ordermgmt.pagination.default-page-size:20}")
    private int defaultPageSize;

    // SpEL expression
    @Value("#{systemProperties['user.home']}/orders")
    private String ordersDir;

    // From environment variable (fallback to property)
    @Value("${DATABASE_URL:jdbc:postgresql://localhost:5432/ordermgmt}")
    private String databaseUrl;
}
```

---


## Recommended YouTube Videos

- **[Spring Tutorial 01 - Understanding Dependency Injection]** by Java Brains — The classic introduction to DI and IoC, 2.8M views
  https://www.youtube.com/watch?v=GB8k2-Egfv0

- **[Spring Framework]** (playlist) by Java Brains — Full Spring Framework course covering beans, bean factory, constructor injection, and more
  https://www.youtube.com/playlist?list=PLC97BDEFDCDD169D7

---
← [Previous: Module 01 — Build Tools & Project Setup](./01-build-tools-and-project-setup.md) | [Next: Module 03 — Spring Boot Fundamentals](./03-spring-boot-fundamentals.md) →