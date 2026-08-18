---
title: "Types of Injection: Why Constructor Is Preferred"
description: "Types of Injection: Why Constructor Is Preferred"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0017-types-of-injection.html
---

# Types of Injection: Why Constructor Is Preferred

Spring gives you three ways to deliver a dependency into a bean. Two of them are traps. This lesson shows each style, explains what goes wrong with setter and field injection, and gives you the comparison table that decides every code review.

## Constructor Injection: the one you should use

Dependencies arrive as constructor parameters. The fields are `final`. Spring sees one constructor and calls it automatically, no `@Autowired` needed.

```
@Service
public class OrderService {

    private final CustomerRepository customerRepo;
    private final OrderRepository orderRepo;

    public OrderService(CustomerRepository customerRepo,
                        OrderRepository orderRepo) {
        this.customerRepo = customerRepo;
        this.orderRepo = orderRepo;
    }
}
```

Three things happen for free:

-   **Immutability**: `final` fields cannot be reassigned. The dependency graph is locked after construction.
-   **Compile-time safety**: You cannot instantiate `OrderService` without supplying both repositories. The compiler blocks invalid object states.
-   **Testability**: In a unit test you pass mocks straight to the constructor. No Spring container, no reflection, no magic.

```
// Pure unit test — no Spring needed
@Test
void findsCustomerById() {
    CustomerRepository mockRepo = mock(CustomerRepository.class);
    when(mockRepo.findById(1L)).thenReturn(new Customer("Ada"));

    OrderService service = new OrderService(mockRepo, mock(OrderRepository.class));
    assertThat(service.findCustomer(1L).name()).isEqualTo("Ada");
}
```

## Setter Injection: rarely justified

Dependencies arrive through setter methods annotated with `@Autowired`:

```
@Service
public class OrderService {

    private CustomerRepository customerRepo;

    @Autowired
    public void setCustomerRepository(CustomerRepository customerRepo) {
        this.customerRepo = customerRepo;
    }
}
```

The field cannot be `final` because it is assigned after construction. That means an `OrderService` can exist in a half-initialized state: the object is alive but its dependency is `null`. This is legal Java and illegal good design.

Setter injection has one legitimate use: **optional dependencies** that the class can function without. If the dependency truly may be absent, a setter communicates "nice to have" better than a constructor parameter. In practice, optional dependencies are rare. Most beans need all of their collaborators.

## Field Injection: avoid entirely

Dependencies are injected directly into private fields using `@Autowired`:

```
@Service
public class OrderService {

    @Autowired  // ❌ avoid this
    private CustomerRepository customerRepo;
}
```

Field injection looks concise, but every shortcut it offers is a problem:

-   **No `final`**: the field is mutable for the entire lifetime of the object.
-   **Untestable without Spring**: a plain `new OrderService()` leaves `customerRepo` as `null`. Your only options are launching the full Spring context or using reflection to force a value into a private field. Both defeat the purpose of a unit test.
-   **Hidden dependencies**: the constructor is empty. Someone reading `new OrderService()` has no idea that the class secretly requires a repository. Constructor parameters make the contract explicit; field injection buries it.
-   **No compile-time guarantee**: the class compiles without its dependency. You discover the missing bean at runtime, when Spring fails to inject it.

The Spring team themselves recommend against field injection. It survives in legacy code and tutorials because it saves keystrokes, but those keystrokes cost you every time you write a test.

## Comparison

| Feature | Constructor | Setter | Field |
| --- | --- | --- | --- |
| Immutable (`final`) | Yes | No | No |
| Testable without Spring | Yes | Yes | No |
| Compile-time safety | Yes | No | No |
| Dependencies visible in API | Yes | No | No |
| Supports optional deps | No | Yes | Yes |
| Needs `@Autowired` | No\* | Yes | Yes |

*\* When a class has exactly one constructor, Spring uses it automatically. Add a second constructor and you'll need `@Autowired` on the primary one.*

## The rule

**Always use constructor injection.** Never use `@Autowired` on fields. Use setter injection only for genuinely optional dependencies, and question whether the dependency is truly optional before you write that setter.

**Primary sources:** [Spring: Dependency Injection](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html) · [Fowler: IoC Containers and the DI Pattern](https://martinfowler.com/articles/injection.html)

## Check your understanding

<details>
<summary>1. Why can constructor-injected fields be declared final while setter-injected fields cannot?</summary>
<p><strong>Correct answer:</strong> Constructor injection assigns fields before the object is fully constructed; setters assign after</p>
</details>

<details>
<summary>2. Can you unit-test a field-injected class without launching the Spring container?</summary>
<p><strong>Correct answer:</strong> No: the private field is null without Spring; you'd need reflection</p>
</details>

<details>
<summary>3. When does Spring require @Autowired on a constructor?</summary>
<p><strong>Correct answer:</strong> When the class has more than one constructor</p>
</details>

<details>
<summary>4. What is the one legitimate use case for setter injection?</summary>
<p><strong>Correct answer:</strong> When a dependency is genuinely optional for the class to function</p>
</details>

<details>
<summary>5. A class uses field injection. You call new OrderService() in a test. What happens when you invoke a method that uses the injected dependency?</summary>
<p><strong>Correct answer:</strong> A NullPointerException: the field was never assigned</p>
</details>
