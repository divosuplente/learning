---
title: "Circular Dependencies & Lifecycle Hooks"
description: "Circular Dependencies & Lifecycle Hooks"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0019-circular-deps-and-lifecycle.html
---

# Circular Dependencies & Lifecycle Hooks

Two beans that need each other. A service that must open a connection *after* its dependencies arrive. These are the two runtime puzzles that trip up every Spring developer. This lesson covers what circular dependencies are, why Spring rejects them, how to break the cycle, and the hooks that let you run code at the right moment in a bean's life.

## The Circular Dependency Problem

A **circular dependency** occurs when Bean A depends on Bean B, and Bean B depends on Bean A. Spring cannot construct either one first: it needs B to build A, and A to build B, so it throws an error at startup.

```
@Service
public class OrderService {
    private final CustomerService customerService;

    public OrderService(CustomerService customerService) {
        this.customerService = customerService;
    }
}

@Service
public class CustomerService {
    private final OrderService orderService;

    public CustomerService(OrderService orderService) {
        this.orderService = orderService;
    }
}
// Spring fails: "The dependencies of some of the beans form a cycle"
```

With constructor injection and `final` fields, this is a hard failure. Spring can't create a half-constructed object. This is a *feature*, not a bug: it forces you to fix the design.

## Solution 1: Extract a Third Service (Preferred)

The root cause is usually shared logic that both services need. Pull that logic into a third service that depends on neither:

```
@Service
public class OrderLookupService {
    public boolean hasActiveOrders(Long customerId) { ... }
}

@Service
public class OrderService {
    private final OrderLookupService lookup;
    public OrderService(OrderLookupService lookup) { this.lookup = lookup; }
}

@Service
public class CustomerService {
    private final OrderLookupService lookup;
    public CustomerService(OrderLookupService lookup) { this.lookup = lookup; }
}
```

The dependency graph goes from `A &harr; B` to `A &rarr; C &larr; B`. No cycle. This is almost always the right fix: if two services need each other, a concept is missing from your model.

## Solution 2: Use Application Events

Sometimes the circular call is one-directional in practice: A creates something and B needs to react. Instead of A calling B directly, A publishes an event:

```
@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public void createOrder(CreateOrderRequest request) {
        // ... create order ...
        publisher.publishEvent(new OrderCreatedEvent(order.getId()));
    }
}

@Service
public class CustomerService {
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        // React to the event — no direct dependency on OrderService
    }
}
```

`CustomerService` no longer depends on `OrderService`, so the cycle is broken. Events also decouple the two services: `OrderService` doesn't know or care who listens.

## The Bean Lifecycle

Every Spring bean goes through a well-defined sequence from creation to destruction:

```
1. Instantiation         — Spring calls the constructor
2. Dependency injection   — Spring sets @Autowired fields / constructor args
3. *Aware callbacks       — setBeanName(), setBeanFactory(), setApplicationContext()
4. @PostConstruct         — your initialization logic runs here
5. afterPropertiesSet()   — InitializingBean interface (legacy)
6. Custom init method     — @Bean(initMethod = "...")
7. ★ Bean is ready for use ★
   ──── (bean serves requests) ────
8. @PreDestroy            — your cleanup logic runs here
9. destroy()              — DisposableBean interface (legacy)
10. Custom destroy method — @Bean(destroyMethod = "...")
```

You will almost never implement steps 3, 5, 6, 9, or 10 directly. The two hooks that matter are `@PostConstruct` and `@PreDestroy`.

## @PostConstruct

`@PostConstruct` runs **after** all dependencies have been injected. It is the right place for initialization that needs injected beans to be available:

```
import jakarta.annotation.PostConstruct;

@Service
public class OrderService {
    private final OrderRepository orderRepo;
    private ConnectionPool pool;

    public OrderService(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }

    @PostConstruct
    public void init() {
        // orderRepo is already set — safe to use
        this.pool = new ConnectionPool(10);
    }
}
```

Why not just put this in the constructor? You could for `ConnectionPool`, but if your initialization calls methods *on injected beans*, those beans must already be fully wired. The constructor runs before Spring finishes injection on *other* beans in the same cycle. `@PostConstruct` guarantees everything is ready.

## @PreDestroy

`@PreDestroy` runs before the application context shuts down. Use it to release resources: close connections, flush buffers, stop threads.

```
import jakarta.annotation.PreDestroy;

@Service
public class OrderService {
    private ConnectionPool pool;

    @PreDestroy
    public void cleanup() {
        pool.close();
    }
}
```

**Important:** both annotations come from `jakarta.annotation` (not `javax.annotation`). Spring Boot 3+ uses the Jakarta namespace.

## Constructor vs @PostConstruct: When to Use Each

| Use the constructor when | Use @PostConstruct when |
| --- | --- |
| Setting `final` fields from injected deps | Calling methods on injected beans |
| Simple, dependency-free initialization | Allocating resources (connections, caches) that need cleanup |
| Everything you need arrives via constructor params | Initialization depends on the bean being fully wired |

Prefer the constructor. Reach for `@PostConstruct` only when the constructor can't do the job.

**Primary sources:** [Spring: Circular Dependencies](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html) · [Spring: Lifecycle Callbacks](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html) · [Jakarta: @PostConstruct](https://jakarta.ee/specifications/annotations/2.1/apidocs/jakarta/annotation/PostConstruct)

## Check your understanding

<details>
<summary>1. Why does Spring throw an error for circular dependencies with constructor injection?</summary>
<p><strong>Correct answer:</strong> Neither bean can be constructed without the other already existing</p>
</details>

<details>
<summary>2. When does @PostConstruct run relative to dependency injection?</summary>
<p><strong>Correct answer:</strong> After all dependencies are injected, before the bean is used</p>
</details>

<details>
<summary>3. You have InvoiceService → PaymentService → InvoiceService. What is the preferred fix?</summary>
<p><strong>Correct answer:</strong> Extract the shared logic into a third service that both depend on</p>
</details>

<details>
<summary>4. In Spring Boot 3+, which package does @PostConstruct come from?</summary>
<p><strong>Correct answer:</strong> jakarta.annotation</p>
</details>

<details>
<summary>5. OrderService publishes an OrderCreatedEvent and CustomerService handles it with @EventListener. Does OrderService depend on CustomerService?</summary>
<p><strong>Correct answer:</strong> No: the publisher only knows about the event, not the listener</p>
</details>
