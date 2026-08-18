---
title: "Spring IoC Container & Stereotype Annotations"
description: "Spring IoC Container & Stereotype Annotations"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0016-spring-ioc-and-stereotypes.html
---

# Spring IoC Container & Stereotype Annotations

In the last lesson you saw the problem: `new` creates tight coupling. Now meet the solution: the **Spring IoC container**, which discovers your classes, creates them, and wires their dependencies together. All you do is add the right annotation.

## The Spring IoC Container

The container is the "supplier" from the restaurant analogy: it takes responsibility for creating objects and delivering them where they're needed. Three terms you'll see constantly:

| Term | Meaning |
| --- | --- |
| **Bean** | A Java object managed by the Spring container. Any object Spring creates and can inject is a bean. |
| **Application Context** | The container itself: the registry of every bean in your application. Accessed via `ApplicationContext`. |
| **Wiring** | The process of connecting beans to their dependencies. Spring does this automatically based on types. |

When Spring starts, it follows a four-step loop:

1.  **Scan**: find every class annotated with a stereotype annotation.
2.  **Instantiate**: create a bean for each discovered class.
3.  **Resolve**: figure out which beans depend on which other beans (by reading constructor parameters).
4.  **Inject**: pass the right beans into the right constructors.

You never call `new` on a Spring-managed class. The container does it for you.

## Stereotype Annotations

Spring uses **stereotype annotations** to mark classes as beans. When the container scans your packages, it finds every annotated class and registers it:

| Annotation | Purpose | When to Use |
| --- | --- | --- |
| `@Component` | Generic Spring bean | When no specific stereotype fits |
| `@Service` | Business logic | Service classes (e.g., `OrderService`) |
| `@Repository` | Data access | Repository classes (e.g., `OrderRepository`) |
| `@Controller` | Web requests | REST controllers (or `@RestController`) |

Functionally, these annotations are **nearly identical**: they all register the class as a Spring bean. The different names exist for *semantic clarity*: they communicate the role of the class to humans reading the code. Spring does add one small bonus to `@Repository`: automatic exception translation for persistence errors.

```
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    // Spring sees one constructor → injects OrderRepository automatically
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order createOrder(OrderRequest request) {
        return orderRepository.save(new Order(request));
    }
}
```

## Component Scanning

Remember `@SpringBootApplication` from Module 01? It includes `@ComponentScan`. This tells Spring:

1.  Look in the package `com.example.ordermgmt` and **all sub-packages**.
2.  Find every class annotated with `@Component`, `@Service`, `@Repository`, `@Controller`, or `@Configuration`.
3.  Create a bean for each and wire them together.

If a class sits **outside the scanned package tree**, Spring will never find it, no matter how many annotations you put on it. This is the single most common "why isn't my bean being created?" problem.

```
// com.example.ordermgmt.service.OrderService  ✓ scanned
// com.example.utils.StringHelper              ✗ NOT scanned (different package tree)
```

To include additional packages, you can override the scan base:

```
@SpringBootApplication(scanBasePackages = {
    "com.example.ordermgmt",
    "com.example.utils"
})
```

## `@Autowired`: Optional with Constructor Injection

The `@Autowired` annotation tells Spring to inject a dependency. But with constructor injection, it's **optional** when the class has exactly one constructor:

```
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    // @Autowired is OPTIONAL — Spring auto-detects single constructors
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}
```

Spring's rule: **one constructor = automatic wiring**, no annotation needed. You only need `@Autowired` when a class has multiple constructors (which is usually a code smell) or when using setter or field injection (which we avoid).

💡 Adding `@Autowired` on a single-constructor class is harmless (some teams do it for explicitness), but it's not required.

## Putting It All Together

Here's a complete picture of how the container, stereotypes, and scanning work as a system:

```
// 1. The repository — @Repository registers it as a bean
@Repository
public class OrderRepository {
    public Order save(Order order) { /* persist */ }
}

// 2. The service — @Service registers it; constructor receives the repo
@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
}

// 3. Spring Boot's main class — @ComponentScan kicks off discovery
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

When `Application.main()` runs, Spring scans `com.example.ordermgmt`, finds `OrderRepository` and `OrderService`, creates beans for both, and passes the repository into the service's constructor. You wrote zero wiring code.

**Primary sources:** [Spring: The IoC Container](https://docs.spring.io/spring-framework/reference/core/beans.html) · [Spring: Classpath Scanning](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html) · [Spring: @Autowired](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html)

## Check your understanding

<details>
<summary>1. What is a Spring bean?</summary>
<p><strong>Correct answer:</strong> Any object managed by the Spring container</p>
</details>

<details>
<summary>2. You add @Service to a class in com.example.utils, but your @SpringBootApplication is in com.example.ordermgmt. What happens?</summary>
<p><strong>Correct answer:</strong> Spring never finds the class: component scanning is package-tree scoped</p>
</details>

<details>
<summary>3. Does a class annotated with @Service need @Autowired on its single constructor for Spring to inject dependencies?</summary>
<p><strong>Correct answer:</strong> No: Spring auto-wires single constructors without @Autowired</p>
</details>

<details>
<summary>4. What is the functional difference between @Component and @Service?</summary>
<p><strong>Correct answer:</strong> They are functionally identical: the names exist for semantic clarity</p>
</details>

<details>
<summary>5. What does the Application Context not do?</summary>
<p><strong>Correct answer:</strong> Compile your Java source code into bytecode</p>
</details>
