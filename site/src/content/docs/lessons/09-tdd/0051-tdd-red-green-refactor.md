---
title: "TDD: Red-Green-Refactor Cycle"
description: "TDD: Red-Green-Refactor Cycle"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/09-tdd/0051-tdd-red-green-refactor.md
---

# TDD: The Red-Green-Refactor Cycle

In the last lesson you saw *what* testing is and *why* it matters. This lesson flips the sequence: instead of writing code and testing it afterward, you write the test **first**. That discipline is Test-Driven Development, and it follows one three-step loop, Red, Green, Refactor, for every feature you ever build.

## What Is TDD?

**Test-Driven Development** is a practice where you write a failing test that describes the behavior you want, then write the minimum production code to make that test pass, then clean up. The test is the spec; the code is the implementation.

This sounds backwards. Most developers write code, then retro-fit tests. TDD inverts that habit, and the inversion is the point. When the test comes first, three properties emerge automatically: *testability by design*, *living documentation*, and *instant feedback*.

## The Red-Green-Refactor Cycle

```
    ┌──────────┐
    │   RED    │  Write a test that fails (the code doesn't exist yet)
    └────┬─────┘
         │
    ┌────▼─────┐
    │  GREEN   │  Write the minimum code to make the test pass
    └────┬─────┘
         │
    ┌────▼─────┐
    │ REFACTOR │  Improve the code without changing behavior
    └────┬─────┘
         │
    └────>──── (repeat)
```

### Red: Write a Failing Test

You write a test that calls code which does not exist yet. You run it. It fails, and the test runner shows red. This failure is *meaningful*: it proves the test is actually checking something, and it pins down exactly the behavior you intend to build.

```
// Red: this won't compile — OrderCalculator doesn't exist yet
@Test
void shouldCalculateTotalForSingleItem() {
    OrderCalculator calc = new OrderCalculator();
    calc.addItem(new LineItem("Widget", 2, 9.99));
    assertThat(calc.total()).isEqualTo(19.98);
}
```

A red that compiles but fails at runtime is valid. A red that doesn't compile is fine too: you just created the compile error that *precisely* describes what's missing.

### Green: Make It Pass, Nothing More

Write the **minimum** code that makes the test turn green. This is not the moment for elegant design. Hard-coded values, brute-force logic, even `return 19.98`: if it passes the test, it's correct *for this cycle*.

```
// Green: the simplest thing that works
public class OrderCalculator {
    private final List<LineItem> items = new ArrayList<>();

    public void addItem(LineItem item) { items.add(item); }

    public double total() {
        return items.stream()
            .mapToDouble(i -> i.quantity() * i.price())
            .sum();
    }
}
```

The key discipline: **do not add code the test doesn't require**. If the test doesn't mention discounts, there is no discount field. If the test doesn't mention tax, there is no tax calculation. YAGNI (You Aren't Gonna Need It) is enforced by the test.

### Refactor: Clean Up While Staying Green

Now that the test passes, improve the code. Rename variables. Extract methods. Remove duplication. After *every* small change, run the test again. It stays green, proving you didn't alter observable behavior.

```
// Refactor: extract a method for clarity
public class OrderCalculator {
    private final List<LineItem> items = new ArrayList<>();

    public void addItem(LineItem item) { items.add(item); }

    public double total() {
        return items.stream()
            .mapToDouble(this::lineTotal)
            .sum();
    }

    private double lineTotal(LineItem item) {
        return item.quantity() * item.price();
    }
}
```

The test still passes. The behavior is identical. But the code is cleaner, and you *know* it's identical because the test proves it.

## Why TDD Works

| Benefit | Without TDD | With TDD |
| --- | --- | --- |
| Test coverage | Tests are an afterthought, often skipped | Every feature has a test by construction |
| Testability | Code is designed first, then retro-fitted for testing | Code is testable by design: you wrote the test first |
| Over-engineering | Easy to add "might need this later" code | Only code demanded by a test exists |
| Feedback speed | Find out days later that something broke | Know within seconds whether your code works |
| Documentation | Docs drift, go stale, lie | Tests are executable documentation; they can't lie |

### Testable by Design

When the test comes first, you are forced to think about the interface before the implementation. You ask: "How would I call this? What does it return? What dependencies does it need?" That forces you toward small, focused methods with clear inputs and outputs, the hallmarks of testable code.

### Living Documentation

Tests describe *what* the code does, in executable form. That documentation can never go stale: if the code changes without the test changing, the test fails and alerts you immediately. A new developer can read the test suite and understand the system's intended behavior.

### Instant Feedback

Each Red-Green-Refactor cycle takes seconds to minutes. You know right now whether your code works, not after a week-long QA cycle. That feedback loop is the same one that makes REPL-driven development and hot-reload powerful: the shorter the gap between change and verification, the faster you learn.

## Common Misconceptions

-   **"TDD means writing all tests upfront."** No. You write *one* failing test, make it pass, then write the next one. Incremental, not batch.
-   **"The Green step should produce production-quality code."** No. Green is about speed: the simplest code that passes. Quality comes in Refactor.
-   **"Refactor means changing behavior."** No. Refactor means changing structure while preserving behavior. The green tests are your safety net.
-   **"TDD replaces all other testing."** No. TDD drives unit tests. You still need integration and E2E tests for cross-component correctness.

**Primary sources:** [Kent Beck, *Test-Driven Development: By Example*](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530) · [Martin Fowler on TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html) · [Agile Alliance TDD Definition](https://www.agilealliance.org/glossary/tdd/)

## Check your understanding

<details>
<summary>1. In the TDD Red-Green-Refactor cycle, what does the Green step require you to do?</summary>
<p><strong>Correct answer:</strong> Write the minimum code that makes the failing test pass</p>
</details>

<details>
<summary>2. Why is a Red test (one that fails) considered valuable rather than wasteful?</summary>
<p><strong>Correct answer:</strong> It proves the test is actually checking something and pins down the intended behavior</p>
</details>

<details>
<summary>3. During the Refactor step, you rename a method and extract a helper. How do you verify you didn't break anything?</summary>
<p><strong>Correct answer:</strong> Run the existing unit test; it stays green, meaning behavior is unchanged</p>
</details>

<details>
<summary>4. A developer says: "I wrote the test, made it green, then added error-handling and logging that no test requires." Which TDD principle did they violate?</summary>
<p><strong>Correct answer:</strong> The Green principle: only write code the test demands; write a new test first</p>
</details>

<details>
<summary>5. How does TDD provide "living documentation"?</summary>
<p><strong>Correct answer:</strong> Tests describe intended behavior in executable form; if the code drifts, the test fails</p>
</details>
