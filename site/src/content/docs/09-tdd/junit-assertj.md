---
title: "Module 09: JUnit 5 & AssertJ"
description: "JUnit 5 & AssertJ"
---

## 5. JUnit 5

**JUnit 5** is the most popular testing framework for Java. It provides annotations and classes for writing and running tests.

### Core Annotations

| Annotation | Purpose |
|------------|---------|
| `@Test` | Marks a method as a test |
| `@DisplayName` | Gives a test a human-readable name |
| `@BeforeEach` | Runs before each test — use for setup |
| `@AfterEach` | Runs after each test — use for cleanup |
| `@BeforeAll` | Runs once before all tests — must be `static` |
| `@AfterAll` | Runs once after all tests — must be `static` |
| `@ParameterizedTest` | Runs the same test with different inputs |
| `@Nested` | Groups related tests in an inner class |
| `@Disabled` | Skips a test |

### A Simple Test Class

```java
package com.example.ordermgmt.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

import static org.assertj.core.api.Assertions.assertThat;

class OrderCalculatorTest {

    private OrderCalculator calculator;

    @BeforeEach
    void setUp() {
        // This runs before every test
        calculator = new OrderCalculator();
    }

    @Test
    @DisplayName("Should calculate total for a single item")
    void shouldCalculateTotalForSingleItem() {
        // Arrange
        BigDecimal unitPrice = new BigDecimal("49.99");
        int quantity = 3;

        // Act
        BigDecimal total = calculator.calculateTotal(unitPrice, quantity);

        // Assert
        assertThat(total).isEqualByComparingTo("149.97");
    }

    @Test
    @DisplayName("Should return zero when quantity is zero")
    void shouldReturnZeroWhenQuantityIsZero() {
        BigDecimal unitPrice = new BigDecimal("99.99");
        int quantity = 0;

        BigDecimal total = calculator.calculateTotal(unitPrice, quantity);

        assertThat(total).isEqualByComparingTo("0.00");
    }
}
```

### The Arrange-Act-Assert Pattern

Notice the pattern in each test:

1. **Arrange** — set up the data and preconditions
2. **Act** — call the method being tested
3. **Assert** — verify the result is correct

This three-part structure makes tests easy to read. You can always find the "act" line — it's where the method under test is called.

### Parameterized Tests

When you want to test the same logic with different inputs, use `@ParameterizedTest`:

```java
@ParameterizedTest
@DisplayName("Should calculate total correctly for various inputs")
@CsvSource({
    "49.99, 3, 149.97",
    "10.00, 5, 50.00",
    "0.01, 100, 1.00",
    "99.99, 0, 0.00"
})
void shouldCalculateTotalCorrectly(String unitPrice, int quantity, String expectedTotal) {
    BigDecimal price = new BigDecimal(unitPrice);

    BigDecimal total = calculator.calculateTotal(price, quantity);

    assertThat(total).isEqualByComparingTo(expectedTotal);
}
```

This runs the same test 4 times with different inputs. Each row is one test execution.

### Nested Tests

Group related tests in inner classes with `@Nested`:

```java
@DisplayName("OrderCalculator")
class OrderCalculatorTest {

    private OrderCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new OrderCalculator();
    }

    @Nested
    @DisplayName("calculateTotal")
    class CalculateTotal {

        @Test
        @DisplayName("should multiply price by quantity")
        void shouldMultiplyPriceByQuantity() { ... }

        @Test
        @DisplayName("should return zero when quantity is zero")
        void shouldReturnZeroWhenQuantityIsZero() { ... }
    }

    @Nested
    @DisplayName("calculateGrandTotal")
    class CalculateGrandTotal {

        @Test
        @DisplayName("should sum all item totals")
        void shouldSumAllItemTotals() { ... }
    }
}
```

This produces nicely structured output in the test runner:

```
OrderCalculator
  > calculateTotal
    > should multiply price by quantity
    > should return zero when quantity is zero
  > calculateGrandTotal
    > should sum all item totals
```

---

## 6. AssertJ

**AssertJ** is a fluent assertion library that makes assertions more readable than JUnit's built-in assertions.

### Comparison

```java
// JUnit built-in assertion — hard to read
assertEquals(149.97, total.doubleValue(), 0.001);
assertTrue(orders.size() > 0);
assertNotNull(customer);
assertEquals(OrderStatus.PENDING, order.getStatus());

// AssertJ — fluent, readable chain
assertThat(total).isEqualByComparingTo("149.97");
assertThat(orders).isNotEmpty();
assertThat(customer).isNotNull();
assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
```

### Useful AssertJ Assertions

```java
// Strings
assertThat(name).isNotBlank();
assertThat(name).startsWith("Alice");
assertThat(email).contains("@");

// Collections
assertThat(orders).hasSize(3);
assertThat(orders).isNotEmpty();
assertThat(orders).extracting(OrderResponse::status)
        .contains(OrderStatus.PENDING, OrderStatus.CONFIRMED);
assertThat(orders).allSatisfy(order -> {
    assertThat(order.getId()).isNotNull();
    assertThat(order.getTotalAmount()).isPositive();
});

// Exceptions
assertThatThrownBy(() -> orderService.confirmOrder(999L))
        .isInstanceOf(OrderNotFoundException.class)
        .hasMessageContaining("999");

// BigDecimal
assertThat(total).isEqualByComparingTo("149.97");
assertThat(total).isPositive();
assertThat(total).isGreaterThan(new BigDecimal("100.00"));
```

### Why AssertJ Over JUnit Assertions?

1. **Readability:** `assertThat(orders).hasSize(3)` reads like a sentence
2. **Chainability:** You can chain assertions: `assertThat(name).isNotBlank().startsWith("A")`
3. **Better error messages:** When an assertion fails, AssertJ shows exactly what went wrong: `Expected size: 3 but was: 5`
4. **Type safety:** The compiler knows the type, so you get autocomplete

---
