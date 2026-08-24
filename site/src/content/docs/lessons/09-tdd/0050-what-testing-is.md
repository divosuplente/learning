---
title: "What Testing Is & The Test Pyramid"
description: "What Testing Is & The Test Pyramid"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/09-tdd/0050-what-testing-is.md
---

# What Testing Is & The Test Pyramid

**Testing** is the deliberate execution of your code to verify it does what you intend. You write code, then you write *another* piece of code that calls the first and checks whether the result is correct. If that sounds circular, good. The test defines what "correct" means, and the production code satisfies it.

## Why We Test

| Reason | What it means |
| --- | --- |
| **Catch bugs early** | A bug found during development costs minutes. The same bug found in production costs hours or days. |
| **Prevent regressions** | When you change code, old tests verify you didn't break existing behavior. |
| **Living documentation** | Tests show how code is supposed to be used. A new developer can read tests to understand the system. |
| **Design feedback** | Code that's hard to test is usually badly designed: too many dependencies, too much coupling. |
| **Confidence to refactor** | With good tests, you can restructure code without fear of breaking things. |
| **Faster debugging** | A failing test points you to exactly which code is broken. |

### What happens without tests

1.  You write code and manually test it (click through the UI or `curl`).
2.  It works, so you move on.
3.  Six months later, you add a new feature.
4.  The new feature breaks something you didn't think about.
5.  The bug reaches production; a customer reports it.
6.  You spend hours debugging because you don't remember how the old code works.

Tests prevent steps 3 through 7.

## Types of Tests

### Unit Tests

A **unit test** tests a single method or class in isolation. All external dependencies are replaced with **mocks**, fake versions that return predetermined values.

*Analogy:* Testing a single car part on a workbench. You test whether the alternator produces electricity, without needing the entire car.

**Speed:** milliseconds. You can run hundreds per second.

```
// Unit test: OrderService with a mocked repository
@Test
void shouldThrowWhenStockIsInsufficient() {
    Product product = new Product("widget", 2);
    when(productRepo.findById(1L)).thenReturn(Optional.of(product));

    assertThatThrownBy(() -> orderService.createOrder(1L, 5))
        .isInstanceOf(InsufficientStockException.class);
}
```

### Integration Tests

An **integration test** tests how multiple components work together. Dependencies are real, not mocked.

*Analogy:* Installing the alternator in the car and testing whether the battery charges when the engine runs.

**Speed:** seconds. They start a Spring context and talk to a real (or test) database.

```
// Integration test: real Spring context, real database
@DataJpaTest
class OrderRepositoryIntegrationTest {

    @Autowired
    private OrderRepository orderRepo;

    @Test
    void shouldPersistAndRetrieveOrder() {
        Order order = new Order("widget", 3);
        orderRepo.save(order);

        Order found = orderRepo.findById(order.getId()).orElseThrow();
        assertThat(found.getQuantity()).isEqualTo(3);
    }
}
```

### End-to-End (E2E) Tests

An **E2E test** tests the entire system from the outside, simulating a real user.

*Analogy:* Driving the car on the road to see if it starts, accelerates, and brakes.

**Speed:** minutes. They start the entire application and make real HTTP requests.

```
// E2E test: full application running, real HTTP
@Test
void shouldCreateOrderViaApi() {
    mockMvc.perform(post("/api/orders")
            .contentType("application/json")
            .content("{\"product\":\"widget\",\"quantity\":3}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.product").value("widget"));
}
```

## The Test Pyramid

The **test pyramid** is a guideline for how many of each test type you should have:

          ╱╲
         ╱  ╲           E2E Tests (few)
        ╱────╲
       ╱      ╲         Integration Tests (some)
      ╱────────╲
     ╱          ╲       Unit Tests (many)
    ╱────────────╲

| Level | Quantity | Why |
| --- | --- | --- |
| Unit tests | ~80% of tests | Fast, isolate bugs, easy to write |
| Integration tests | ~15% of tests | Verify components work together |
| E2E tests | ~5% of tests | Slow, fragile, but verify the whole system |

**Why more unit tests?** They're fast (milliseconds), reliable (no external dependencies to fail), and precise (when one fails, you know exactly which code is broken). Integration and E2E tests are slower, and when they fail, the cause could be *anywhere* in the stack: the database, the network, the configuration, the code itself.

The pyramid is not a rigid formula; it's a heuristic. If your codebase breaks the ratio and has more E2E tests than unit tests, you'll feel it: slow CI, flakes that are hard to diagnose, and long feedback loops. Push tests *down* the pyramid whenever you can. A bug caught by a unit test is fixed in seconds; the same bug caught by an E2E test is fixed in minutes or hours because you have to locate it first.

**Primary sources:** [Martin Fowler: The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) · [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/) · [Spring Boot Testing Reference](https://docs.spring.io/spring-boot/reference/testing/index.html)

## Check your understanding

<details>
<summary>1. A unit test for OrderService.createOrder() uses a mocked ProductRepository that returns a product with zero stock. What is this test primarily verifying?</summary>
<p><strong>Correct answer:</strong> That the service throws an exception when stock is insufficient</p>
</details>

<details>
<summary>2. According to the test pyramid, you have 100 integration tests and 50 E2E tests. Approximately how many unit tests should you aim for?</summary>
<p><strong>Correct answer:</strong> About 800, unit tests should be ~80% of the total</p>
</details>

<details>
<summary>3. An E2E test fails. Why is it harder to locate the bug than when a unit test fails?</summary>
<p><strong>Correct answer:</strong> The failure could be in any layer (code, database, network, config), so you must narrow it down first</p>
</details>

<details>
<summary>4. Your team has 200 E2E tests, 300 integration tests, and 100 unit tests. The CI pipeline takes 45 minutes. What is the most effective way to speed it up?</summary>
<p><strong>Correct answer:</strong> Push tests down the pyramid: replace E2E scenarios with unit and integration tests</p>
</details>

<details>
<summary>5. Which of these is a valid reason to write an integration test instead of a unit test?</summary>
<p><strong>Correct answer:</strong> You need to verify that a JPA repository query returns the correct rows from a real database</p>
</details>
