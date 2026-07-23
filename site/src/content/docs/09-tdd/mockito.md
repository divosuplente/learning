---
title: "Module 09: Mockito"
description: "Mockito"
---

## 7. Mockito

**Mockito** is a library for creating **mocks** — fake versions of your dependencies that you control. In unit tests, you don't want to use a real database (too slow, too complex). Instead, you mock the repository and tell it what to return.

### Core Mockito Concepts

| Concept | What it does |
|---------|-------------|
| `@Mock` | Creates a mock of a class or interface |
| `@InjectMocks` | Creates an instance of a class and injects the mocks into its constructor |
| `when(mock.method(args)).thenReturn(value)` | Tells the mock to return `value` when `method` is called with `args` |
| `verify(mock).method(args)` | Checks that `method` was called with `args` |
| `any()` | Matches any argument (useful when you don't care about the exact value) |
| `eq(value)` | Matches a specific value (needed when mixing with `any()`) |

### A Mocked Unit Test

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.domain.ProductEntity;
import com.example.ordermgmt.repository.CustomerRepository;
import com.example.ordermgmt.repository.OrderRepository;
import com.example.ordermgmt.repository.ProductRepository;
import com.example.ordermgmt.service.exception.CustomerNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CustomerRepository customerRepository;

    @InjectMocks
    private OrderService orderService;

    // Note: In a real test, you'd also mock the OrderEventProducer
    // and anything else OrderService depends on.
}
```

### What's Happening Here?

1. `@ExtendWith(MockitoExtension.class)` — tells JUnit to use Mockito for this test class
2. `@Mock` — creates a mock implementation of each repository. The mocks return `null` or `Optional.empty()` by default
3. `@InjectMocks` — creates a real `OrderService` instance and injects the mock repositories through its constructor
4. The `OrderService` thinks it's talking to real repositories, but it's actually talking to mocks that we control

### When-ThenReturn: Stubs

`when(...).thenReturn(...)` tells a mock what to return when a method is called:

```java
@Test
@DisplayName("Should throw when customer is not found")
void shouldThrowWhenCustomerNotFound() {
    // Arrange: mock the customer repository to return empty (customer not found)
    when(customerRepository.findById(999L)).thenReturn(Optional.empty());

    // Act & Assert: calling createOrder should throw CustomerNotFoundException
    assertThatThrownBy(() -> orderService.getOrderById(999L))
            .isInstanceOf(CustomerNotFoundException.class)
            .hasMessageContaining("999");
}
```

### Verifying Interactions

`verify(mock).method(args)` checks that a method was called on the mock:

```java
@Test
@DisplayName("Should save order when customer exists")
void shouldSaveOrderWhenCustomerExists() {
    // Arrange
    CustomerEntity customer = new CustomerEntity();
    customer.setId(1L);
    customer.setName("Alice");
    when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
    when(orderRepository.findById(1L)).thenReturn(Optional.of(createOrder(customer)));

    // Act
    OrderResponse response = orderService.getOrderById(1L);

    // Assert
    assertThat(response).isNotNull();
    assertThat(response.customerName()).isEqualTo("Alice");

    // Verify that the repository was called
    verify(orderRepository).findById(1L);
}
```

### Argument Matchers

When you don't care about the exact argument, use matchers:

```java
// any() matches any argument
when(productRepository.findById(any())).thenReturn(Optional.of(product));
when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

// eq() for specific values when using any() for others
verify(orderRepository).save(any(OrderEntity.class));
```

---
