# Module 09: Test-Driven Development

## What You'll Learn

- What testing is and why we test our code
- The different types of tests: unit, integration, and end-to-end
- The test pyramid and why most tests should be unit tests
- What Test-Driven Development (TDD) is and the Red-Green-Refactor cycle
- How to write tests with JUnit 5
- How to write readable assertions with AssertJ
- How to mock dependencies with Mockito
- How to follow TDD step by step to build an `OrderCalculator` and `OrderService`
- Spring Boot test slices: `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`
- How to test REST controllers with MockMvc
- How to test repositories with Testcontainers
- How to measure test coverage with JaCoCo
- How to test Kafka consumers
- How to test reactive streams with StepVerifier

## Prerequisites

- [Module 00: Java Foundations](./00-java-foundations.md) — you understand Java classes, records, exceptions, generics
- [Module 01: Build Tools & Project Setup](./01-build-tools-and-project-setup.md) — you have a Maven project
- [Module 02: Dependency Injection](./02-dependency-injection.md) — you understand beans and constructor injection
- [Module 03: Spring Boot Fundamentals](./03-spring-boot-fundamentals.md) — you understand REST controllers and DTOs
- [Module 04: Repository Pattern](./04-repository-pattern.md) — you understand JPA entities and repositories
- [Module 05: Service-Oriented Architecture](./05-service-oriented-architecture.md) — you understand the service layer and transactions
- [Module 06: Kafka](./06-kafka.md) — you understand Kafka producers and consumers
- [Module 08: Reactor Pattern](./08-reactor-pattern.md) — you understand Mono and Flux (for testing reactive code)

---

## 1. What Is Testing? Why Do We Test?

**Testing** is the deliberate execution of your code to verify it does what you intend it to do. You write a piece of code, then you write another piece of code that calls the first piece and checks whether the result is correct.

### Why Test?

| Reason | Explanation |
|--------|-------------|
| **Catch bugs early** | A bug found during development costs minutes to fix. The same bug found in production costs hours or days. |
| **Prevent regressions** | When you change code, old tests verify you didn't break existing behavior. |
| **Living documentation** | Tests show how your code is supposed to be used. A new developer can read tests to understand the system. |
| **Design feedback** | If code is hard to test, it's usually badly designed — too many dependencies, too much coupling. |
| **Confidence** | With good tests, you can refactor and add features without fear of breaking things. |
| **Faster debugging** | When something breaks, a failing test points you to exactly which code is broken. |

### What Happens Without Tests?

1. You write code and manually test it (click through the UI or use curl)
2. It works, so you move on
3. Six months later, you add a new feature
4. The new feature breaks something you didn't think about
5. The bug reaches production
6. A customer reports it
7. You spend hours debugging because you don't remember how the old code works

Tests prevent steps 3 through 7.

---

## 2. Types of Tests

### Unit Tests

A **unit test** tests a single piece of code (a single method or class) in isolation. All external dependencies are replaced with **mocks** (fake versions that return predetermined values).

**Analogy:** Testing a single car part on a workbench — you test whether the alternator produces electricity, without needing the entire car.

**Speed:** milliseconds. You can run hundreds per second.

**Example:** Testing that `OrderService.createOrder()` throws `InsufficientStockException` when stock is too low, with a mocked repository that returns a product with low stock.

### Integration Tests

An **integration test** tests how multiple components work together. Dependencies are real, not mocked.

**Analogy:** Installing the alternator in the car and testing whether the battery charges when the engine runs.

**Speed:** seconds. They start a Spring context and talk to a real (or test) database.

**Example:** Testing that `OrderService.createOrder()` saves the order to a real PostgreSQL database running in a Docker container, and the order can be retrieved afterward.

### End-to-End (E2E) Tests

An **E2E test** tests the entire system from the outside, simulating a real user.

**Analogy:** Driving the car on the road to see if it starts, accelerates, and brakes.

**Speed:** minutes. They start the entire application and make real HTTP requests.

**Example:** Sending a `POST /api/orders` request to a running server and verifying the response, the database state, and that a Kafka event was published.

---

## 3. The Test Pyramid

The **test pyramid** is a guideline for how many of each test type you should have:

```
          ╱╲
         ╱  ╲           E2E Tests (few)
        ╱────╲
       ╱      ╲         Integration Tests (some)
      ╱────────╲
     ╱          ╲       Unit Tests (many)
    ╱────────────╲
```

| Level | Quantity | Why |
|-------|----------|-----|
| Unit tests | 80% of tests | Fast, isolate bugs, easy to write |
| Integration tests | 15% of tests | Verify components work together |
| E2E tests | 5% of tests | Slow, fragile, but verify the whole system |

**Why more unit tests?** They're fast (milliseconds), reliable (no external dependencies to fail), and precise (when one fails, you know exactly which code is broken). Integration and E2E tests are slower and when they fail, the cause could be anywhere.

---

## 4. What Is TDD?

**Test-Driven Development (TDD)** is a development practice where you write the test **before** you write the production code. This sounds backwards, but it's incredibly powerful.

### The Red-Green-Refactor Cycle

TDD follows a three-step cycle:

```
    ┌──────────┐
    │   RED    │  Write a test that fails (because the code doesn't exist yet)
    └────┬─────┘
         │
    ┌────▼─────┐
    │  GREEN   │  Write the minimum code to make the test pass
    └────┬─────┘
         │
    ┌────▼─────┐
    │ REFACTOR │  Improve the code without changing behavior (tests stay green)
    └────┬─────┘
         │
    └────>──── (repeat)
```

**Red:** You write a test that describes what you want the code to do. You run it. It fails because the code doesn't exist yet. This is called "red" because the test runner shows red (failure).

**Green:** You write the minimum code to make the test pass. This isn't about perfect code — it's about making the test pass as quickly as possible. You run the test. It passes (green).

**Refactor:** Now that the test passes, you improve the code — rename variables, extract methods, remove duplication — without changing behavior. You run the test after each change. It stays green, proving you didn't break anything.

### Why TDD?

1. **You never forget to write tests** — they come first, not last
2. **The code is testable by design** — if you write the test first, the code is naturally testable
3. **You only write code that's needed** — the test defines exactly what's needed; no speculative features
4. **Instant feedback** — you know within seconds whether your code works
5. **Living documentation** — tests describe what the code does, in executable form

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

## 8. TDD Walkthrough: Building OrderCalculator

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

## 9. TDD Walkthrough: Building OrderService

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

## 10. Spring Boot Test Slices

Spring Boot provides **test slices** — specialized test configurations that load only the parts of the application you need for each test type. This makes tests faster than loading the entire application.

| Annotation | What It Loads | What It Mocks | Use For |
|------------|---------------|---------------|---------|
| `@WebMvcTest(MyController.class)` | Only the web layer (one controller + Spring MVC) | All services | Controller tests |
| `@DataJpaTest` | Only JPA (repositories + entity manager + test database) | Controllers, services | Repository tests |
| `@SpringBootTest` | The entire application | Nothing (or mock specific beans) | Integration tests |
| `@JsonTest` | Only Jackson serialization | Everything else | DTO serialization tests |

### Web Layer Tests with MockMvc

`@WebMvcTest` loads a controller and its MVC infrastructure without starting a full server:

```java
package com.example.ordermgmt.controller;

import com.example.ordermgmt.dto.OrderResponse;
import com.example.ordermgmt.domain.OrderStatus;
import com.example.ordermgmt.service.OrderService;
import com.example.ordermgmt.service.exception.OrderNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    @Test
    void shouldReturnOrderWhenIdExists() throws Exception {
        // Arrange
        OrderResponse response = new OrderResponse(
                1L, 7L, "Alice", OrderStatus.CONFIRMED,
                new BigDecimal("149.97"), Instant.now(), List.of()
        );
        when(orderService.getOrderById(1L)).thenReturn(response);

        // Act & Assert
        mockMvc.perform(get("/api/orders/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.customerName").value("Alice"));
    }

    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        when(orderService.getOrderById(999L)).thenThrow(new OrderNotFoundException(999L));

        mockMvc.perform(get("/api/orders/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Order not found: 999"));
    }

    @Test
    void shouldCreateOrderWhenInputIsValid() throws Exception {
        String requestBody = """
                {
                    "customerId": 1,
                    "items": [
                        {"productId": 10, "quantity": 2}
                    ]
                }
                """;

        OrderResponse response = new OrderResponse(
                1L, 1L, "Alice", OrderStatus.PENDING,
                new BigDecimal("39.98"), Instant.now(), List.of()
        );
        when(orderService.createOrder(any())).thenReturn(response);

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void shouldReturn400WhenCustomerIdIsNull() throws Exception {
        String requestBody = """
                {
                    "customerId": null,
                    "items": [{"productId": 10, "quantity": 2}]
                }
                """;

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest());
    }
}
```

### What's Happening Here?

1. `@WebMvcTest(OrderController.class)` — loads only `OrderController` and its MVC dependencies
2. `@MockBean` — replaces the real `OrderService` with a Mockito mock
3. `MockMvc` — simulates HTTP requests without a real server. You can send GET/POST requests and check the response
4. `jsonPath("$.id").value(1)` — checks a JSON field in the response using JSONPath expressions
5. The validation test (`shouldReturn400WhenCustomerIdIsNull`) tests that `@Valid` on the controller correctly rejects invalid input — no service is involved

### Repository Tests with @DataJpaTest

```java
package com.example.ordermgmt.repository;

import com.example.ordermgmt.domain.CustomerEntity;
import com.example.ordermgmt.domain.OrderEntity;
import com.example.ordermgmt.domain.OrderStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Test
    void shouldSaveAndFindOrderById() {
        // Arrange
        CustomerEntity customer = new CustomerEntity();
        customer.setName("Alice");
        customer.setEmail("alice@example.com");
        customer.setAddress("123 Main St");
        CustomerEntity savedCustomer = customerRepository.save(customer);

        OrderEntity order = new OrderEntity();
        order.setCustomer(savedCustomer);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("99.99"));
        order.setCreatedAt(Instant.now());

        // Act
        OrderEntity saved = orderRepository.save(order);
        var found = orderRepository.findById(saved.getId());

        // Assert
        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(found.get().getCustomer().getName()).isEqualTo("Alice");
    }

    @Test
    void shouldFindOrdersByCustomerId() {
        CustomerEntity customer = new CustomerEntity();
        customer.setName("Bob");
        customer.setEmail("bob@example.com");
        CustomerEntity savedCustomer = customerRepository.save(customer);

        OrderEntity order1 = new OrderEntity();
        order1.setCustomer(savedCustomer);
        order1.setStatus(OrderStatus.PENDING);
        order1.setTotalAmount(new BigDecimal("50.00"));
        order1.setCreatedAt(Instant.now());
        orderRepository.save(order1);

        OrderEntity order2 = new OrderEntity();
        order2.setCustomer(savedCustomer);
        order2.setStatus(OrderStatus.CONFIRMED);
        order2.setTotalAmount(new BigDecimal("75.00"));
        order2.setCreatedAt(Instant.now());
        orderRepository.save(order2);

        var orders = orderRepository.findByCustomerId(savedCustomer.getId());

        assertThat(orders).hasSize(2);
        assertThat(orders).extracting(OrderEntity::getStatus)
                .containsExactlyInAnyOrder(OrderStatus.PENDING, OrderStatus.CONFIRMED);
    }
}
```

### What's Happening Here?

1. `@DataJpaTest` — loads only JPA infrastructure (Hibernate, entity manager, repositories)
2. `@Testcontainers` — starts a real PostgreSQL Docker container
3. `@ServiceConnection` — Spring Boot auto-configures the database connection from the container
4. `@AutoConfigureTestDatabase(replace = Replace.NONE)` — tells Spring NOT to replace our PostgreSQL with an in-memory database (we want to test against real PostgreSQL)
5. The test saves an entity, finds it again, and verifies the data

**Why Testcontainers?** An in-memory database (like H2) behaves differently from PostgreSQL. SQL that works in H2 might fail in PostgreSQL. Testcontainers gives you a **real** PostgreSQL in Docker, so your tests match production behavior.

---

## 11. JaCoCo: Measuring Test Coverage

**JaCoCo** (Java Code Coverage) measures how much of your code is exercised by tests. It reports the percentage of lines, branches, and methods covered.

### Adding JaCoCo to Maven

Add to your `pom.xml`:

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>verify</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### Running Coverage

```bash
mvn verify
```

This runs all tests and generates a coverage report at `target/site/jacoco/index.html`. Open it in your browser to see:
- Line coverage: percentage of code lines executed by tests
- Branch coverage: percentage of `if`/`else` branches taken
- Method coverage: percentage of methods called

The `check` goal **fails the build** if coverage drops below 80% — ensuring the team maintains quality.

---

## 12. Testing Kafka Consumers

Spring Boot provides `@EmbeddedKafka` for testing Kafka without a Docker container:

### Adding Test Dependencies

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka-test</artifactId>
    <scope>test</scope>
</dependency>
```

### Kafka Consumer Test

```java
package com.example.ordermgmt.kafka;

import com.example.ordermgmt.kafka.event.OrderCreatedEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@EmbeddedKafka(
        partitions = 1,
        topics = {"order-events"}
)
class OrderEventConsumerTest {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private OrderEventConsumer consumer;

    @Test
    void shouldConsumeOrderCreatedEvent() throws Exception {
        // Arrange
        OrderCreatedEvent event = new OrderCreatedEvent(
                42L, 7L, "Alice", new BigDecimal("149.97"), Instant.now()
        );

        // Act
        kafkaTemplate.send("order-events", String.valueOf(42L), event);
        kafkaTemplate.flush();

        // Wait for the consumer to process
        // Use a latch or Awaitility for more robust waiting
        Thread.sleep(2000);

        // Assert — verify the consumer processed the message
        // (In a real test, you'd check a side effect like a database update
        // or use CountDownLatch for deterministic waiting)
    }
}
```

---

## 13. Testing Reactive Streams with StepVerifier

For testing Mono and Flux (from Module 08), use **StepVerifier** from the `reactor-test` library:

### Adding the Dependency

```xml
<dependency>
    <groupId>io.projectreactor</groupId>
    <artifactId>reactor-test</artifactId>
    <scope>test</scope>
</dependency>
```

### StepVerifier Example

```java
package com.example.ordermgmt.reactive;

import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Duration;
import java.util.List;

class ReactiveServiceTest {

    @Test
    void shouldVerifyFluxEmissions() {
        Flux<String> flux = Flux.just("PENDING", "CONFIRMED", "SHIPPED");

        StepVerifier.create(flux)
                .expectNext("PENDING")
                .expectNext("CONFIRMED")
                .expectNext("SHIPPED")
                .verifyComplete();
    }

    @Test
    void shouldVerifyErrorInFlux() {
        Flux<Integer> flux = Flux.range(1, 3)
                .map(i -> {
                    if (i == 3) {
                        throw new RuntimeException("Three is not allowed");
                    }
                    return i;
                });

        StepVerifier.create(flux)
                .expectNext(1)
                .expectNext(2)
                .expectError(RuntimeException.class)
                .verify();
    }

    @Test
    void shouldVerifyMonoWithValue() {
        Mono<String> mono = Mono.just("Hello Reactive!");

        StepVerifier.create(mono)
                .expectNext("Hello Reactive!")
                .verifyComplete();
    }

    @Test
    void shouldVerifyEmptyMono() {
        Mono<String> mono = Mono.empty();

        StepVerifier.create(mono)
                .verifyComplete();
    }
}
```

### What StepVerifier Does

StepVerifier subscribes to the reactive stream and verifies each event as it arrives:
- `expectNext(value)` — checks the next emitted item
- `expectError(Exception.class)` — checks that the stream throws an error
- `verifyComplete()` — checks that the stream completed successfully
- `verify()` — starts the verification (blocking) and checks everything asserted above

---

## 14. Anti-Patterns to Avoid

### Testing Implementation Details

```java
// BAD — testing how the code works, not what it does
@Test
void shouldCallRepositorySaveExactlyOnce() {
    orderService.createOrder(request);
    verify(orderRepository, times(1)).save(any());
}
```

If you later optimize the code to batch saves, this test breaks even though the behavior didn't change. Test **behavior**, not implementation.

### Over-Mocking

```java
// BAD — mocking everything, including the class under test
@Mock
OrderService orderService; // Don't mock the class you're testing!
```

If you mock the class under test, you're testing the mock, not the real code. Mock only dependencies **of** the class under test.

### Brittle Tests

```java
// BAD — depends on exact date/time, breaks if run at a different time
@Test
void shouldSetCreatedAtToNow() {
    OrderResponse response = orderService.createOrder(request);
    assertThat(response.createdAt()).isEqualTo(Instant.now());
}
```

Use a `Clock` dependency or test that `createdAt` is "close to now" rather than exactly now.

### Testing Getters and Setters

```java
// BAD — testing that a getter returns what the setter set
@Test
void shouldReturnName() {
    CustomerEntity customer = new CustomerEntity();
    customer.setName("Alice");
    assertThat(customer.getName()).isEqualTo("Alice");
}
```

Getters and setters are generated by the compiler or Lombok. Testing them tests the framework, not your code.

---

## 15. Best Practices Summary

| Practice | Why |
|----------|-----|
| Write tests first (TDD) | Forces you to think about design before implementation |
| One concept per test | When a test fails, you know exactly what broke |
| Arrange-Act-Assert structure | Makes tests readable and organized |
| Use `@DisplayName` | Test names should read like sentences: "Should throw when customer is not found" |
| Test behavior, not implementation | Implementation changes; behavior shouldn't have to change |
| Use test data builders | Avoid repeating setup code in every test |
| Keep tests fast | Unit tests should run in under 1 second total |
| Run tests on every save | Configure your IDE to run tests automatically |
| Don't test framework code | Don't test that Spring's `@Transactional` works |
| Name tests descriptively | `shouldThrowWhenStockInsufficient` not `test3` |

---

## Exercises

### Exercise 1: Write Tests for OrderCalculator

Using TDD, build an `OrderCalculator` with these methods and write tests first for each:
- `calculateTotal(BigDecimal unitPrice, int quantity)` — returns `unitPrice * quantity`
- `calculateGrandTotal(List<BigDecimal> itemTotals)` — sums all item totals
- `applyDiscount(BigDecimal total, BigDecimal discountPercent)` — returns `total * (1 - discount/100)`

<details>
<summary>Hint</summary>

For each method: write a test for the happy path (valid input), a test for zero/empty, and a test for invalid input (negative discount, null price). Use `assertThatThrownBy` for exception tests. Write the test, see it fail, implement, see it pass, refactor.
</details>

### Exercise 2: Write a Controller Test

Write a `@WebMvcTest` for a `ProductController` that has:
- `GET /api/products/{id}` — returns a product
- `POST /api/products` — creates a product
- Tests for: product found (200), product not found (404), invalid input (400)

<details>
<summary>Hint</summary>

Follow the `OrderControllerTest` pattern. Use `@MockBean ProductService`, `when(productService.getProductById(...)).thenReturn(...)`, and `when(productService.getProductById(999L)).thenThrow(new ProductNotFoundException(999L))`. Use `jsonPath` to check response fields.
</details>

### Exercise 3: Write a Repository Test

Write a `@DataJpaTest` for `ProductRepository` that tests:
- Saving a product and finding it by ID
- Finding products by category
- Finding products with low stock (custom query)

<details>
<summary>Hint</summary>

Follow the `OrderRepositoryTest` pattern. Use `@Testcontainers` with a real PostgreSQL container. For the low stock test, save two products with different stock levels and query for `stock < threshold`.
</details>

### Exercise 4: Write a Reactive Test with StepVerifier

Create a `Flux<OrderEvent>` that emits 3 order events and write a StepVerifier test that verifies each emission and completion.

<details>
<summary>Hint</summary>

Use `Flux.just(event1, event2, event3)` to create the flux. Use `StepVerifier.create(flux).expectNext(event1).expectNext(event2).expectNext(event3).verifyComplete()`. Create the events as simple records with `orderId`, `status`, and `timestamp` fields.
</details>

---

## What You Learned

- **Testing** verifies your code does what it should — it catches bugs early, prevents regressions, documents behavior, and gives confidence to refactor
- The three types of tests are **unit** (isolated, fast), **integration** (components together), and **E2E** (entire system) — follow the **test pyramid** with 80% unit, 15% integration, 5% E2E
- **TDD** follows the **Red-Green-Refactor** cycle: write a failing test, write minimum code to pass it, then refactor with confidence
- **JUnit 5** provides `@Test`, `@BeforeEach`, `@ParameterizedTest`, `@Nested` for structuring tests
- **AssertJ** provides fluent, readable assertions: `assertThat(value).isEqualTo(expected)`
- **Mockito** creates mock dependencies: `@Mock`, `@InjectMocks`, `when().thenReturn()`, `verify()` — mock dependencies OF the class under test, never the class itself
- **Test slices** load only what's needed: `@WebMvcTest` (controllers), `@DataJpaTest` (repositories), `@SpringBootTest` (everything)
- **MockMvc** tests REST endpoints without a real server — send requests and check JSON responses with `jsonPath`
- **Testcontainers** runs real PostgreSQL in Docker for repository tests that match production behavior
- **JaCoCo** measures code coverage and can fail the build below a threshold (e.g., 80%)
- **@EmbeddedKafka** or Testcontainers Kafka runs a real Kafka broker in tests
- **StepVerifier** tests reactive streams by verifying each emission, error, and completion event
- Anti-patterns: testing implementation details, over-mocking, brittle tests (exact dates), testing getters/setters

---

## 15. Test Smells and Anti-Patterns

### Testing Implementation Details (White-Box Testing)

```java
// BAD: testing the internal implementation
@Test
void test_internal_method_order() {
    var service = new OrderService(repo, producer);
    service.createOrder(request);
    // Asserting on a private field or internal list
    assertEquals(1, service.getInternalEventQueue().size());  // breaks on refactor
}

// GOOD: testing observable behavior
@Test
void createOrder_publishes_one_event() {
    when(repo.save(any())).thenReturn(order);
    service.createOrder(request);
    verify(producer, times(1)).publishOrderCreated(any());  // stable contract
}
```

### Excessive Mocking (Mock Everything Anti-Pattern)

```java
// BAD: mocking a data class / record
OrderResponse mockDto = mock(OrderResponse.class);  // mocks a simple DTO
when(mockDto.customerName()).thenReturn("Alice");

// GOOD: just construct it
OrderResponse dto = new OrderResponse(1L, "Alice", OrderStatus.PENDING, ...);
```

**Rule:** Only mock types you **don't own** (external services, databases) or
types that are **expensive to construct**. Data classes and records should be
instantiated directly.

### Brittle Assertions

```java
// BAD: exact date comparison — breaks if test runs at different time
assertEquals(Instant.parse("2025-01-15T10:00:00Z"), order.getCreatedAt());

// GOOD: assert the order was created recently
assertThat(order.getCreatedAt())
        .isCloseTo(Instant.now(), within(1, ChronoUnit.SECONDS));
```

### Test Pyramid vs Ice Cream Cone

```
       /\
      /E2E\          ← few (5%): Slow, high-level, real browser + DB
     /------\
    /  Integ \       ← some (25%): Real database, real Spring context
   /----------\
  /    Unit     \    ← many (70%): Fast, isolated, mocked dependencies
 /----------------\
```

**Ice cream cone (bad):** many E2E tests, few unit tests. Slow, flaky, hard to
maintain.

**Test pyramid (good):** many unit tests, some integration tests, few E2E tests.
Fast, targeted, reliable.

---

## 16. Integration Testing Strategy

### Test Slices

| Slice | Loads | Doesn't Load | When to Use |
|-------|-------|-------------|-------------|
| `@WebMvcTest` | Spring MVC + one controller | Services, repositories | Controller logic, validation, serialization |
| `@DataJpaTest` | JPA + entity manager + test DB | Controllers, services | Repository queries, entity mappings |
| `@JsonTest` | Jackson serialization | Everything else | DTO serialization round-trip |
| `@SpringBootTest` | Entire application | Nothing | End-to-end integration |
| `@RestClientTest` | One REST client + mock server | Everything else | RestTemplate / WebClient behavior |

### When to Use Each

```java
// @WebMvcTest: test controller without starting the full app
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mockMvc;
    @MockBean OrderService orderService;

    @Test
    void GET_orders_returns_200() throws Exception {
        when(orderService.findAll()).thenReturn(List.of(orderResponse));
        mockMvc.perform(get("/api/orders"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$[0].customerName").value("Alice"));
    }
}

// @DataJpaTest: test repository against real PostgreSQL via Testcontainers
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {
    @Container @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderRepository repo;

    @Test
    void findByStatus_returns_matching_orders() {
        repo.save(new OrderEntity(customer, OrderStatus.PENDING));
        var results = repo.findByStatus(OrderStatus.PENDING);
        assertThat(results).hasSize(1);
    }
}
```

---

## 17. Test Coverage and Code Quality

### JaCoCo Configuration

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
        <execution>
            <id>check</id>
            <goals><goal>check</goal></goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>INSTRUCTION</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### What to Cover vs What Not To

| Cover | Don't Cover |
|-------|-------------|
| Business logic (services, domain rules) | Getters and setters |
| Edge cases (null, empty, max values) | Spring Boot framework internals |
| Error handling paths | Infrastructure code (tested in integration) |
| State transitions | DTOs with no behavior |
| Boundary conditions | Configuration classes |

### Mutation Testing with PIT

Mutation testing verifies test **quality** — not just coverage. PIT modifies
(mates) the production code and checks if tests fail (kill the mutant):

```xml
<plugin>
    <groupId>org.pitest</groupId>
    <artifactId>pitest-maven</artifactId>
    <version>1.15.0</version>
    <configuration>
        <mutationThreshold>70</mutationThreshold>
        <targetClasses>
            <param>com.example.ordermgmt.*</param>
        </targetClasses>
    </configuration>
</plugin>
```

Run with: `mvn org.pitest:pitest-maven:mutationCoverage`

If PIT changes `>` to `>=` and your test still passes, your test doesn't adequately
verifying that boundary.

---

## Recommended YouTube Videos

- **[Test Driven Development (TDD) in Spring]** by Dan Vega — TDD approach to testing REST controllers in Spring Boot (51:09, 39K views)
  https://www.youtube.com/watch?v=-H5sud1-K5A

- **[Spring Boot Testing - Batteries Included]** by Dan Vega — Comprehensive overview of Spring Boot testing capabilities
  https://www.youtube.com/watch?v=rUbjV3VY1DI

---

← [Previous: Module 08](./08-reactor-pattern.md) | [Next: Module 10](./10-capstone-project.md) →
