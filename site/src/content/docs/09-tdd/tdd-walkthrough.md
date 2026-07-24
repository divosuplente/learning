---
title: "Module 09: TDD Walkthrough"
description: "TDD Walkthrough"
---

## 1. TDD Walkthrough: Building OrderCalculator

Let's follow TDD to build an `OrderCalculator` — a class that calculates order totals.

### Step 1: Red — Write a Failing Test

```java
package com.example.ordermgmt.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class OrderCalculatorTest {

    private OrderCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new OrderCalculator();
    }

    @Test
    @DisplayName("Should calculate total for single item")
    void shouldCalculateTotalForSingleItem() {
        BigDecimal unitPrice = new BigDecimal("49.99");
        int quantity = 3;

        BigDecimal total = calculator.calculateTotal(unitPrice, quantity);

        assertThat(total).isEqualByComparingTo("149.97");
    }
}
```

**Run the test.** It fails because `OrderCalculator` doesn't exist.

### Step 2: Green — Write the Minimum Code

```java
package com.example.ordermgmt.service;

import java.math.BigDecimal;

public class OrderCalculator {

    public BigDecimal calculateTotal(BigDecimal unitPrice, int quantity) {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
```

**Run the test.** It passes.

### Step 3: Red — Add Another Test

```java
@Test
@DisplayName("Should return zero when quantity is zero")
void shouldReturnZeroWhenQuantityIsZero() {
    BigDecimal unitPrice = new BigDecimal("99.99");
    int quantity = 0;

    BigDecimal total = calculator.calculateTotal(unitPrice, quantity);

    assertThat(total).isEqualByComparingTo("0.00");
}
```

**Run the test.** It passes (because `BigDecimal.valueOf(0)` gives zero, and multiplying by zero gives zero).

### Step 4: Red — Test for Negative Quantity

```java
@Test
@DisplayName("Should throw when quantity is negative")
void shouldThrowWhenQuantityIsNegative() {
    BigDecimal unitPrice = new BigDecimal("49.99");
    int quantity = -1;

    assertThatThrownBy(() -> calculator.calculateTotal(unitPrice, quantity))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Quantity must be non-negative");
}
```

**Run the test.** It fails — no exception is thrown.

### Step 5: Green — Add Validation

```java
public BigDecimal calculateTotal(BigDecimal unitPrice, int quantity) {
    if (quantity < 0) {
        throw new IllegalArgumentException("Quantity must be non-negative");
    }
    return unitPrice.multiply(BigDecimal.valueOf(quantity));
}
```

**Run the tests.** All pass.

### Step 6: Red — Test for Null Price

```java
@Test
@DisplayName("Should throw when unit price is null")
void shouldThrowWhenUnitPriceIsNull() {
    assertThatThrownBy(() -> calculator.calculateTotal(null, 3))
            .isInstanceOf(NullPointerException.class)
            .hasMessage("Unit price must not be null");
}
```

**Run the test.** It fails.

### Step 7: Green — Add Null Check

```java
public BigDecimal calculateTotal(BigDecimal unitPrice, int quantity) {
    if (unitPrice == null) {
        throw new NullPointerException("Unit price must not be null");
    }
    if (quantity < 0) {
        throw new IllegalArgumentException("Quantity must be non-negative");
    }
    return unitPrice.multiply(BigDecimal.valueOf(quantity));
}
```

**Run the tests.** All pass.

### Step 8: Refactor

The code is already clean. Maybe add `Objects.requireNonNull` for the null check:

```java
import java.util.Objects;

public BigDecimal calculateTotal(BigDecimal unitPrice, int quantity) {
    Objects.requireNonNull(unitPrice, "Unit price must not be null");
    if (quantity < 0) {
        throw new IllegalArgumentException("Quantity must be non-negative");
    }
    return unitPrice.multiply(BigDecimal.valueOf(quantity));
}
```

**Run the tests.** Still green. Refactoring is safe because tests protect us.

---

## 2. TDD Walkthrough: Building OrderService

Now let's build a piece of `OrderService` using TDD, with mocked repositories.

### Step 1: Red — Write a Test for "Should Create Order"

```java
package com.example.ordermgmt.service;

import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.dto.CreateOrderItemRequest;
import com.example.ordermgmt.dto.CreateOrderRequest;
import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.repository.CustomerRepository;
import com.example.ordermgmt.repository.OrderRepository;
import com.example.ordermgmt.repository.ProductRepository;
import com.example.ordermgmt.kafka.OrderEventProducer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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
    @Mock
    private OrderEventProducer eventProducer;

    @InjectMocks
    private OrderService orderService;

    @Test
    @DisplayName("Should create order when customer and product exist and stock is sufficient")
    void shouldCreateOrderWhenValidInput() {
        // Arrange
        CustomerEntity customer = new CustomerEntity();
        customer.setId(1L);
        customer.setName("Alice");

        ProductEntity product = new ProductEntity();
        product.setId(10L);
        product.setName("Widget");
        product.setPrice(new BigDecimal("19.99"));
        product.setStock(100);

        CreateOrderRequest request = new CreateOrderRequest(1L, List.of(
                new CreateOrderItemRequest(10L, 5)
        ));

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(
                invocation -> {
                    OrderEntity order = invocation.getArgument(0);
                    order.setId(1L);
                    return order;
                }
        );

        // Act
        OrderResponse response = orderService.createOrder(request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.totalAmount()).isEqualByComparingTo("99.95");

        // Verify that the product stock was reduced
        assertThat(product.getStock()).isEqualTo(95);

        // Verify that save was called
        verify(orderRepository).save(any(OrderEntity.class));
    }
}
```

**Run the test.** It fails because `OrderService.createOrder()` doesn't exist yet.

### Step 2: Green — Implement `createOrder`

(We already wrote the full `OrderService` in Module 05. For TDD practice, you would write it incrementally — but even with the full implementation, the test verifies the behavior is correct.)

**Run the test.** It passes.

### Step 3: Red — Test for "Should Throw When Customer Not Found"

```java
@Test
@DisplayName("Should throw CustomerNotFoundException when customer does not exist")
void shouldThrowWhenCustomerNotFound() {
    CreateOrderRequest request = new CreateOrderRequest(999L, List.of(
            new CreateOrderItemRequest(10L, 5)
    ));

    when(customerRepository.findById(999L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> orderService.createOrder(request))
            .isInstanceOf(CustomerNotFoundException.class)
            .hasMessageContaining("999");
}
```

**Run.** If the test passes, the exception is already thrown. If not, add the check.

### Step 4: Red — Test for "Should Throw When Stock Is Insufficient"

```java
@Test
@DisplayName("Should throw InsufficientStockException when stock is insufficient")
void shouldThrowWhenStockInsufficient() {
    CustomerEntity customer = new CustomerEntity();
    customer.setId(1L);
    customer.setName("Alice");

    ProductEntity product = new ProductEntity();
    product.setId(10L);
    product.setPrice(new BigDecimal("19.99"));
    product.setStock(2); // Only 2 in stock

    CreateOrderRequest request = new CreateOrderRequest(1L, List.of(
            new CreateOrderItemRequest(10L, 5) // Wants 5
    ));

    when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
    when(productRepository.findById(10L)).thenReturn(Optional.of(product));

    assertThatThrownBy(() -> orderService.createOrder(request))
            .isInstanceOf(InsufficientStockException.class)
            .hasMessageContaining("10")
            .hasMessageContaining("available=2")
            .hasMessageContaining("requested=5");
}
```

**Run.** Verify it passes (the check was already implemented).

---
