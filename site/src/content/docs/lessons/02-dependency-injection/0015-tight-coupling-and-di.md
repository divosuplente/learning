---
title: "The Problem: Tight Coupling & What DI Solves"
description: "The Problem: Tight Coupling & What DI Solves"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0015-tight-coupling-and-di.html
---

# The Problem: Tight Coupling & What DI Solves

When a class creates its own dependencies with `new`, it ties itself to one specific implementation, and **that one line will haunt every test, every change, and every new feature** you write afterward. Dependency Injection is the fix: instead of reaching out and grabbing what you need, you declare what you need and let something else provide it.

## Tight coupling with `new`

A class that builds its own collaborators is **tightly coupled**: it cannot function without those exact implementations.

```
public class OrderService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;

    // BAD: OrderService creates its own dependencies
    public OrderService() {
        this.customerRepository = new CustomerRepository(); // hard-coded!
        this.orderRepository = new OrderRepository();       // hard-coded!
    }

    public Customer findCustomer(Long id) {
        return customerRepository.findById(id);
    }
}
```

Those two `new` calls look harmless. They are not.

## Why tight coupling is bad

**1\. Hard to test.** You want to unit-test `findCustomer()`, but the constructor fires up real repositories. In a test you'd need a running database just to check one method, or you'd have to modify `OrderService` itself to accept test doubles, which defeats the purpose.

**2\. Hidden dependencies.** Someone calling `new OrderService()` sees a no-arg constructor and thinks "this thing has no dependencies." It secretly needs two repositories. Hidden dependencies surprise callers and make code impossible to reason about from the API alone.

**3\. No flexibility.** Need a `CustomerRepository` that caches results? A different one for auditing? Too bad. `OrderService` hard-coded which implementation to use. Your only option is to edit `OrderService` itself, violating the open/closed principle.

## The fix: receive, don't create

Instead of reaching out with `new`, the class **declares what it needs** and someone else provides it:

```
public class OrderService {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;

    // GOOD: dependencies arrive through the constructor
    public OrderService(
            CustomerRepository customerRepository,
            OrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
    }
}
```

Now `OrderService` doesn't know or care *how* the repositories are created. It just states "I need these two things." This is **dependency injection**: the dependencies are *injected* from outside rather than created inside.

In a test, you pass in a mock:

```
// Easy — no database needed
var mockCustomerRepo = mock(CustomerRepository.class);
var mockOrderRepo    = mock(OrderRepository.class);
var service          = new OrderService(mockCustomerRepo, mockOrderRepo);
```

## The restaurant analogy

Think of a restaurant kitchen:

-   **Without DI:** The kitchen grows its own tomatoes, raises its own chickens, and bakes its own bread. If the tomato crop fails, the kitchen can't make any tomato dishes. The kitchen is tightly coupled to its own supply chain.
-   **With DI:** A supplier delivers tomatoes, chicken, and bread every morning. The kitchen doesn't care how the tomatoes were grown; it just uses them. If one supplier is unreliable, you swap in a different one. The kitchen never changes.

In software: the **kitchen** is your class (`OrderService`), and the **supplier** is whatever creates and delivers dependencies: your `main` method, a framework, or a container.

## Inversion of Control & the Hollywood Principle

Dependency injection is one technique under a broader principle: **Inversion of Control (IoC)**. Control over creating and managing objects is *inverted*, moved from your code to a container or framework.

IoC is sometimes called the **Hollywood Principle**: *"Don't call us, we'll call you."*

In traditional code, your class calls `new` to get what it needs: your code controls object creation. In IoC, the container creates the objects and pushes them to your code. You don't go looking for dependencies; the container delivers them.

| Traditional (no IoC) | With IoC |
| --- | --- |
| `OrderService` calls `new CustomerRepository()` | Spring creates `CustomerRepository` and gives it to `OrderService` |
| Your code controls object creation | The container controls object creation |
| Your code knows about concrete implementations | Your code only knows about interfaces/types |

The payoff: every class is testable in isolation, swappable without editing, and honest about what it requires.

**Primary sources:** [Oracle: Object-Oriented Programming Concepts](https://docs.oracle.com/javase/tutorial/java/concepts/) · [Martin Fowler: Inversion of Control Containers and the DI Pattern](https://martinfowler.com/articles/injection.html) · [Spring: IoC Container](https://docs.spring.io/spring-framework/reference/core/beans/introduction.html)

## Check your understanding

<details>
<summary>1. What makes new CustomerRepository() inside a constructor a problem?</summary>
<p><strong>Correct answer:</strong> It locks the class to one specific implementation forever</p>
</details>

<details>
<summary>2. A class has a no-arg constructor but internally calls new EmailService(). What is the consequence when writing unit tests?</summary>
<p><strong>Correct answer:</strong> You cannot inject a mock: the real EmailService always runs</p>
</details>

<details>
<summary>3. In the restaurant analogy, what plays the role of the "supplier"?</summary>
<p><strong>Correct answer:</strong> Whatever creates and delivers dependencies (framework, container, or main method)</p>
</details>

<details>
<summary>4. What does "Don't call us, we'll call you" describe in the context of Spring?</summary>
<p><strong>Correct answer:</strong> The Hollywood Principle: the container pushes dependencies to your code, you don't pull them</p>
</details>

<details>
<summary>5. A colleague says: "Our class has a no-arg constructor, so it has zero dependencies." Why might this be wrong?</summary>
<p><strong>Correct answer:</strong> The constructor may call new internally, hiding real dependencies from the signature</p>
</details>
