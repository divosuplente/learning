---
title: "Bean Scopes, @Configuration/@Bean, @Qualifier/@Primary"
description: "Bean Scopes, @Configuration/@Bean, @Qualifier/@Primary"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/02-dependency-injection/0018-bean-scopes-and-config.md
---

# Bean Scopes, `@Configuration`/`@Bean`, `@Qualifier`/`@Primary`

So far every bean you've written has been a singleton: one object shared across the entire application. That's the right default most of the time, but not always. This lesson covers the four bean scopes Spring supports, how to create beans when you can't annotate the class yourself, and how to untangle the mess when multiple beans implement the same interface.

## Bean Scopes

A bean's **scope** controls how many instances Spring creates and how long they live:

| Scope | Instances | When to Use |
| --- | --- | --- |
| **singleton** (default) | One per application | Stateless services, repositories, controllers |
| **prototype** | New instance per injection | Stateful per-use objects |
| **request** | One per HTTP request | Web-layer beans scoped to a single request |
| **session** | One per HTTP session | User-specific state across requests |

Set a scope with `@Scope`:

```
@Service
@Scope("prototype")  // new instance every time it's injected
public class OrderCalculator {
    // each injection point gets its own object
}
```

Without `@Scope`, the default is **singleton**. This is correct for nearly all services and repositories, but it comes with a rule.

### The singleton + mutable state trap

A singleton is shared by every thread in your application. If it stores mutable data in instance fields, you have a **race condition**:

```
@Service  // singleton by default — SHARED across all threads
public class OrderService {
    private Order currentOrder;  // DANGEROUS: mutable state

    public void process(Order order) {
        this.currentOrder = order;       // Thread A writes
        // Thread B overwrites before Thread A reads...
        validate(this.currentOrder);     // Wrong order!
    }
}
```

**Rule: singletons must be stateless.** Store data in method-local variables, not instance fields. Injected dependencies (which are also singletons) and constants are fine: they're either shared safely or never change.

## Manual Beans: `@Configuration` + `@Bean`

Stereotype annotations (`@Service`, `@Repository`) only work on classes *you* wrote. When you need a bean from a third-party library, you can't slap `@Component` on someone else's code. Instead, write a `@Configuration` class with `@Bean` methods:

```
@Configuration
public class AppConfig {

    @Bean
    public OrderCalculator orderCalculator(DiscountService discountService) {
        OrderCalculator calc = new OrderCalculator(discountService);
        calc.setPrecision(2);  // custom setup that @Component can't do
        return calc;
    }
}
```

Spring calls the method, registers the returned object as a bean, and injects it wherever needed. The method parameter `DiscountService` is resolved from the container just like constructor injection: Spring passes it in automatically.

### When to use which

| Approach | When |
| --- | --- |
| `@Component` / `@Service` | You own the class and can annotate it |
| `@Bean` in `@Configuration` | Third-party class, or you need custom construction logic |

The bean name defaults to the method name (`orderCalculator`). You can override it: `@Bean("calc")`.

## Resolving Ambiguity: `@Primary` and `@Qualifier`

When two beans implement the same interface, Spring doesn't know which one to inject. The error looks like:

```
Field customerRepository in com.example.OrderService required a
single bean, but 2 were found:
    - postgresCustomerRepository
    - inMemoryCustomerRepository
```

### `@Primary`: the default choice

Mark one bean as the **default** when multiple candidates exist:

```
@Configuration
public class AppConfig {

    @Bean
    @Primary  // use this one when no qualifier is specified
    public CustomerRepository postgresCustomerRepository(DataSource ds) {
        return new JpaCustomerRepository(ds);
    }

    @Bean
    public CustomerRepository inMemoryCustomerRepository() {
        return new InMemoryCustomerRepository();
    }
}
```

Now any injection point that asks for `CustomerRepository` gets the PostgreSQL version automatically.

### `@Qualifier`: the explicit choice

When you want a *specific* bean, not the primary one, name it explicitly:

```
@Service
public class TestOrderService {

    public TestOrderService(
            @Qualifier("inMemoryCustomerRepository")
            CustomerRepository customerRepository) {
        // gets the in-memory version, overriding @Primary
    }
}
```

The qualifier string matches the bean name, which for `@Bean` methods is the method name, and for `@Component` classes is the decapitalized class name.

### `@Primary` vs `@Qualifier`

They solve the same problem from different angles:

-   **`@Primary`** sets a global default. Good when one implementation is "normal" and others are special-case (e.g., prod vs test).
-   **`@Qualifier`** selects a specific bean at the injection point. Good when different classes need different implementations.

When both appear on the same injection point, `@Qualifier` wins: it overrides `@Primary`.

**Primary sources:** [Spring: Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html) · [Spring: @Configuration Classes](https://docs.spring.io/spring-framework/reference/core/beans/java/configuration-classes.html) · [Spring: @Qualifier and @Primary](https://docs.spring.io/spring-framework/reference/core/beans/annotation-config/autowired.html#beans-qualifier-annotation)

## Check your understanding

<details>
<summary>1. You annotate a singleton bean with a mutable instance field and update it from multiple threads. What happens?</summary>
<p><strong>Correct answer:</strong> Race conditions can corrupt the field's value</p>
</details>

<details>
<summary>2. What is the default bean name for a method declared as @Bean public DiscountService promoDiscount()?</summary>
<p><strong>Correct answer:</strong> promoDiscount</p>
</details>

<details>
<summary>3. A class injects an interface that has two beans: one marked @Primary and the other referenced by @Qualifier. Which one is injected?</summary>
<p><strong>Correct answer:</strong> The one named by @Qualifier: it overrides @Primary</p>
</details>

<details>
<summary>4. When should you use @Bean in a @Configuration class instead of @Component on the class itself?</summary>
<p><strong>Correct answer:</strong> When you don't own the class and can't add annotations to it</p>
</details>

<details>
<summary>5. You inject a prototype-scoped bean into a singleton-scoped bean. How many prototype instances does the singleton see over its lifetime?</summary>
<p><strong>Correct answer:</strong> One: the prototype is created once at singleton construction time</p>
</details>
