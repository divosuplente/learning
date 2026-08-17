---
title: "JUnit 5 & AssertJ for Readable Assertions"
description: "JUnit 5 & AssertJ for Readable Assertions"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0052-junit5-and-assertj.html
---

# JUnit 5 & AssertJ for Readable Assertions

JUnit 5 is the standard testing framework for Java. AssertJ is the assertion library that makes your test verifications read like sentences. Together they turn the "assert" step of Arrange-Act-Assert into code you can scan at a glance.

## JUnit 5 Core Annotations

| Annotation | Purpose |
| --- | --- |
| `@Test` | Marks a method as a test |
| `@DisplayName` | Human-readable name in test reports |
| `@BeforeEach` | Runs before *each* test — use for setup |
| `@AfterEach` | Runs after each test — use for cleanup |
| `@BeforeAll` | Runs once before all tests — must be `static` |
| `@AfterAll` | Runs once after all tests — must be `static` |
| `@ParameterizedTest` | Runs the same test with different inputs |
| `@Nested` | Groups related tests in an inner class |
| `@Disabled` | Skips a test |

## A Simple Test Class

```
class OrderCalculatorTest {

    private OrderCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new OrderCalculator();
    }

    @Test
    @DisplayName("Should calculate total for a single item")
    void shouldCalculateTotalForSingleItem() {
        BigDecimal unitPrice = new BigDecimal("49.99");
        int quantity = 3;

        BigDecimal total = calculator.calculateTotal(unitPrice, quantity);

        assertThat(total).isEqualByComparingTo("149.97");
    }

    @Test
    @DisplayName("Should return zero when quantity is zero")
    void shouldReturnZeroWhenQuantityIsZero() {
        BigDecimal total = calculator.calculateTotal(
            new BigDecimal("99.99"), 0);

        assertThat(total).isEqualByComparingTo("0.00");
    }
}
```

Every test follows **Arrange-Act-Assert**: set up data, call the method under test, verify the result. The "act" line — where you call the production method — is always visible and unambiguous.

## Parameterized Tests

When the same logic needs checking across several inputs, `@ParameterizedTest` with `@CsvSource` replaces N near-identical test methods with one:

```
@ParameterizedTest
@CsvSource({
    "49.99, 3, 149.97",
    "10.00, 5, 50.00",
    "0.01, 100, 1.00",
    "99.99, 0, 0.00"
})
void shouldCalculateTotalCorrectly(
        String unitPrice, int quantity, String expected) {
    BigDecimal price = new BigDecimal(unitPrice);

    BigDecimal total = calculator.calculateTotal(price, quantity);

    assertThat(total).isEqualByComparingTo(expected);
}
```

Each row in `@CsvSource` is one test execution. If the third row fails, the other three still pass — you get a precise signal about which input broke the logic.

## Grouping with `@Nested`

`@Nested` lets you organize tests by the method or behavior they cover. Inner classes share the outer class's state and `@BeforeEach` setup:

```
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
        void shouldMultiplyPriceByQuantity() { ... }

        @Test
        void shouldReturnZeroWhenQuantityIsZero() { ... }
    }

    @Nested
    @DisplayName("calculateGrandTotal")
    class CalculateGrandTotal {

        @Test
        void shouldSumAllItemTotals() { ... }
    }
}
```

The test runner displays a tree:

```
OrderCalculator
  > calculateTotal
    > shouldMultiplyPriceByQuantity
    > shouldReturnZeroWhenQuantityIsZero
  > calculateGrandTotal
    > shouldSumAllItemTotals
```

**Key detail:** `@BeforeAll` and `@AfterAll` inside a `@Nested` class *cannot* be `static` — they must be instance methods — because nested inner classes cannot have static members. In the outer class, they remain `static` as usual.

## AssertJ — Fluent Assertions

JUnit ships with `assertEquals`, `assertTrue`, `assertNotNull`, and friends. AssertJ replaces all of them with a single `assertThat` entry point that chains fluently:

| JUnit built-in | AssertJ fluent |
| --- | --- |
| `assertEquals(expected, actual)` | `assertThat(actual).isEqualTo(expected)` |
| `assertTrue(list.size() > 0)` | `assertThat(list).isNotEmpty()` |
| `assertNotNull(customer)` | `assertThat(customer).isNotNull()` |
| `assertEquals(Status.PENDING, o.getStatus())` | `assertThat(o.getStatus()).isEqualTo(Status.PENDING)` |

The AssertJ version reads left-to-right as a sentence: "assert that *actual* is equal to *expected*." When it fails, the error message tells you exactly what went wrong: `Expected size: 3 but was: 5` instead of a bare `AssertionError`.

## Useful AssertJ Assertions

```
// Strings
assertThat(name).isNotBlank().startsWith("Alice");
assertThat(email).contains("@");

// Collections
assertThat(orders).hasSize(3);
assertThat(orders).extracting(OrderResponse::status)
        .contains(Status.PENDING, Status.CONFIRMED);
assertThat(orders).allSatisfy(order -> {
    assertThat(order.getId()).isNotNull();
    assertThat(order.getTotalAmount()).isPositive();
});

// Exceptions
assertThatThrownBy(() -> orderService.confirmOrder(999L))
        .isInstanceOf(OrderNotFoundException.class)
        .hasMessageContaining("999");

// BigDecimal — never use isEqualTo for decimals
assertThat(total).isEqualByComparingTo("149.97");
assertThat(total).isGreaterThan(new BigDecimal("100.00"));
```

**Common trap:** `assertThat(new BigDecimal("1.0")).isEqualTo(new BigDecimal("1.00"))` fails — `isEqualTo` checks `.equals()`, which considers scale. Use `isEqualByComparingTo` for numeric comparison.

## Writing Testable Code

Tests are only as good as the code they test. A class that is hard to test is telling you something: it has too many responsibilities, hidden dependencies, or tight coupling. Three rules keep code testable:

-   **Inject dependencies, don't create them.** A service that `new`s its own `OrderRepository` cannot be tested with a fake. Accept it via constructor — the test supplies a mock or stub.
-   **Avoid static state and singletons.** A static `Clock` or `Database.getInstance()` makes every test share mutable global state. Pass time as a parameter; inject the data source.
-   **Keep methods pure or explicitly side-effecting.** A method that reads the database *and* writes a file *and* returns a result is three things to mock. Split the query from the command from the computation.

```
// Hard to test — hidden dependency
class OrderService {
    private final OrderRepository repo = new OrderRepository();

    BigDecimal calculateTotal(Long orderId) {
        Order order = repo.findById(orderId); // can't substitute
        return order.getItems().stream()
            .map(Item::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

// Testable — dependency injected
class OrderService {
    private final OrderRepository repo;

    OrderService(OrderRepository repo) { this.repo = repo; }

    BigDecimal calculateTotal(Long orderId) {
        Order order = repo.findById(orderId); // test supplies mock
        return order.getItems().stream()
            .map(Item::getPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

The production code is identical at runtime. The difference is that the testable version lets the test control the inputs — which is the entire point.

**Primary sources:** [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/) · [AssertJ Documentation](https://assertj.github.io/doc/) · [JUnit 5 Parameterized Tests](https://junit.org/junit5/docs/current/user-guide/#writing-tests-parameterized-tests)

## Check your understanding

<details>
<summary>1. A @Nested inner class needs a @BeforeAll setup method. Which signature is correct?</summary>
<p><strong>Correct answer:</strong> void beforeAll() — non-static, because inner classes cannot have static members</p>
</details>

<details>
<summary>2. assertThat(new BigDecimal("1.0")).isEqualTo(new BigDecimal("1.00")) — does this pass or fail?</summary>
<p><strong>Correct answer:</strong> Fails — isEqualTo uses .equals(), and scale differs (1.0 ≠ 1.00)</p>
</details>

<details>
<summary>3. @BeforeEach runs before every test. If a test class has one @BeforeEach in the outer class and another in a @Nested class, what happens when a test inside the nested class runs?</summary>
<p><strong>Correct answer:</strong> Both run — outer first, then nested</p>
</details>

<details>
<summary>4. Why is assertThatThrownBy(() -> service.confirm(999L)).isInstanceOf(OrderNotFoundException.class) preferable to assertThrows(OrderNotFoundException.class, () -> service.confirm(999L))?</summary>
<p><strong>Correct answer:</strong> It chains further assertions on the exception — .hasMessageContaining("999") — which assertThrows cannot do fluently</p>
</details>

<details>
<summary>5. A service method calls new OrderRepository() internally instead of accepting it via constructor. What is the testability consequence?</summary>
<p><strong>Correct answer:</strong> The test cannot substitute a mock or fake repository, so it must use the real database — making the test slow, fragile, and coupled to infrastructure</p>
</details>
