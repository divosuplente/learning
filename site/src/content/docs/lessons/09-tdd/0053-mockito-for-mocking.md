---
title: "Mockito for Mocking Dependencies"
description: "Mockito for Mocking Dependencies"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0053-mockito-for-mocking.html
---

# Mockito for Mocking Dependencies

Unit tests should prove one class works in isolation. But real classes have dependencies — repositories, HTTP clients, message producers. If you call the real database in a unit test, you're testing the database too, and your test is slow and fragile. **Mockito** creates fake versions of those dependencies that you control completely.

## The Core Annotations

| Annotation | What it does |
| --- | --- |
| `@Mock` | Creates a mock implementation of a class or interface |
| `@InjectMocks` | Creates a real instance and injects the mocks into its constructor |
| `@ExtendWith(MockitoExtension.class)` | Tells JUnit 5 to initialise the mocks before each test |

```
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CustomerRepository customerRepository;

    @InjectMocks
    private OrderService orderService;
}
```

What happens: Mockito creates a fake `OrderRepository` and a fake `CustomerRepository`, then builds a real `OrderService` and passes the fakes into its constructor. The `OrderService` thinks it's talking to real repositories — but every response is under your control.

## Stubbing with `when().thenReturn()`

A mock with no instructions returns defaults — `null` for objects, `0` for numbers, `false` for booleans, `Optional.empty()` for `Optional`. Stubbing tells the mock what to return:

```
@Test
@DisplayName("Should throw when customer not found")
void shouldThrowWhenCustomerNotFound() {
    // Arrange: tell the mock to return empty
    when(customerRepository.findById(999L))
        .thenReturn(Optional.empty());

    // Act & Assert
    assertThatThrownBy(() -> orderService.getOrderById(999L))
        .isInstanceOf(CustomerNotFoundException.class)
        .hasMessageContaining("999");
}
```

Multiple calls return different values:

```
when(customerRepository.findById(1L))
    .thenReturn(Optional.of(customer))
    .thenReturn(Optional.empty()); // second call returns empty
```

## Stubbing Void Methods — `doThrow` / `doNothing`

You cannot call `when(mock.voidMethod()).thenReturn()` — the inner call returns `void`, breaking the DSL. Instead, use the `do*(...).when()` family:

```
// Throw on void method
doThrow(new IllegalStateException("Order locked"))
    .when(orderRepository).deleteById(42L);

// Explicitly do nothing (rare — void mocks do nothing by default)
doNothing().when(eventProducer).send(any());

// Stub consecutive void calls
doNothing()
    .doThrow(new RuntimeException("Retry failed"))
    .when(emailService).sendConfirmation(any());
```

**Key trap:** `when(mock.voidMethod())` compiles with a raw return but throws `MockitoException` at runtime. Always use `doThrow`/`doNothing`/`doReturn` for void methods.

## Verifying Interactions with `verify()`

Stubbing controls what a mock *returns*. `verify()` asserts what a mock *received*:

```
@Test
@DisplayName("Should persist order when customer exists")
void shouldPersistOrderWhenCustomerExists() {
    // Arrange
    when(customerRepository.findById(1L))
        .thenReturn(Optional.of(customer));
    when(orderRepository.save(any()))
        .thenAnswer(inv -> inv.getArgument(0));

    // Act
    orderService.createOrder(request);

    // Assert: did the service actually call save?
    verify(orderRepository).save(any(OrderEntity.class));

    // Assert: was the notification sent exactly once?
    verify(eventProducer, times(1)).send(any(OrderCreatedEvent.class));

    // Assert: delete was never called
    verify(orderRepository, never()).deleteById(any());
}
```

Built-in verification modes: `times(n)`, `never()`, `atLeastOnce()`, `atMost(n)`, `only()`.

## Argument Matchers

Normally `when(mock.findById(1L))` matches only the literal `1L`. Matchers make stubbing and verification flexible:

| Matcher | Matches |
| --- | --- |
| `any()` | Any value (including null) |
| `any(Class)` | Any value of that type |
| `eq(value)` | Exactly that value (needed when mixing with `any()`) |
| `argThat(pred)` | Any value satisfying the predicate |

**Critical rule:** if you use *one* matcher in a call, you must use matchers for *all* arguments. This fails:

```
// WRONG: mixes literal and matcher
verify(orderRepo).findByCustomerAndStatus(1L, any());

// RIGHT: wrap the literal in eq()
verify(orderRepo).findByCustomerAndStatus(eq(1L), any());
```

## `thenAnswer` for Dynamic Responses

When `thenReturn` is too rigid — you need the mock to compute something based on its input:

```
// Return whatever was passed in (useful for save() stubs)
when(orderRepository.save(any())).thenAnswer(inv -> {
    OrderEntity order = inv.getArgument(0);
    order.setId(99L); // simulate DB-generated ID
    return order;
});
```

This pattern replaces the common anti-pattern of stubbing `save()` with a fixed return, which silently passes tests that never inspect the saved entity.

## The Full Test in Context

```
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepo;
    @Mock private CustomerRepository customerRepo;
    @Mock private OrderEventProducer eventProducer;
    @InjectMocks private OrderService orderService;

    @Test
    @DisplayName("Should create order and publish event")
    void shouldCreateOrderAndPublishEvent() {
        // Arrange
        CustomerEntity customer = new CustomerEntity();
        customer.setId(1L);
        customer.setName("Alice");

        when(customerRepo.findById(1L))
            .thenReturn(Optional.of(customer));
        when(orderRepo.save(any()))
            .thenAnswer(inv -> inv.getArgument(0));

        // Act
        OrderResponse response = orderService.createOrder(
            new CreateOrderRequest(1L, List.of(42L)));

        // Assert state
        assertThat(response.customerName()).isEqualTo("Alice");

        // Assert interactions
        verify(orderRepo).save(any(OrderEntity.class));
        verify(eventProducer).send(any(OrderCreatedEvent.class));
        verify(customerRepo, never()).save(any());
    }
}
```

Notice the pattern: **Arrange** (stub), **Act** (call the method), **Assert** (check state + verify interactions). The mock gives you a wall between your service and the database — you test the logic, not the infrastructure.

**Primary sources:** [Mockito Javadoc](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html) · [Mockito Official Site](https://site.mockito.org/) · [JUnit 5 Extensions](https://junit.org/junit5/docs/current/user-guide/#extensions)

## Check your understanding

<details>
<summary>1. A mock created with @Mock returns null for an unstubbed method that returns Optional. What does it actually return?</summary>
<p><strong>Correct answer:</strong> Optional.empty() — Mockito returns a smart default for Optional</p>
</details>

<details>
<summary>2. You want a mock to throw an exception when its void send(Event e) method is called. Which syntax is correct?</summary>
<p><strong>Correct answer:</strong> doThrow(new RuntimeException()).when(producer).send(any())</p>
</details>

<details>
<summary>3. You write: verify(orderRepo).findByCustomerAndStatus(1L, any()). Mockito throws InvalidUseOfMatchersException. Why?</summary>
<p><strong>Correct answer:</strong> You mixed a literal (1L) with a matcher (any()); use eq(1L) instead</p>
</details>

<details>
<summary>4. Your test stubs when(repo.save(any())), calls the service, and asserts the returned DTO. The test passes — but save() was never actually called. What went wrong?</summary>
<p><strong>Correct answer:</strong> The stub only defines what happens if save() is called; without verify(), the call is never checked</p>
</details>

<details>
<summary>5. @InjectMocks creates a real OrderService and injects mocks. The OrderService constructor also requires a Clock. You forgot to add @Mock Clock clock. What happens?</summary>
<p><strong>Correct answer:</strong> The field is set to null — you get a NullPointerException when the test calls a method that uses Clock</p>
</details>
