---
title: "OOP Fundamentals"
description: "OOP Fundamentals"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/00-java-foundations/0008-oop-fundamentals.md
---

Java is object-oriented at its core. You model your domain with classes, compose behavior through interfaces, and share common structure with abstract classes. The payoff: code that depends on abstractions, not implementations, so you can swap strategies without rewriting callers.

## Classes: state and behavior

A class bundles fields (state) and methods (behavior) into one unit. Access is controlled with `private`, `protected`, and `public`:

```
public class BankAccount {
    private final String accountId;
    private BigDecimal balance;

    public BankAccount(String accountId, BigDecimal initialBalance) {
        this.accountId = accountId;
        this.balance = initialBalance;
    }

    public void deposit(BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deposit must be positive");
        }
        balance = balance.add(amount);
    }

    public void withdraw(BigDecimal amount) {
        if (amount.compareTo(balance) > 0) {
            throw new IllegalStateException("Insufficient funds");
        }
        balance = balance.subtract(amount);
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public String getAccountId() {
        return accountId;
    }
}
```

`accountId` is `final`: set once, never changed. `balance` mutates through controlled methods that enforce invariants. This is encapsulation: the outside world sees *what* the object does, not *how* it stores data.

## Interfaces: contracts without implementation

An interface defines **what** a class must do, not **how**. Callers code against the interface; any implementation fits:

```
public interface PriceCalculator {
    BigDecimal calculatePrice(Order order);
}

public class StandardPriceCalculator implements PriceCalculator {
    @Override
    public BigDecimal calculatePrice(Order order) {
        return order.items().stream()
            .map(OrderItem::lineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

public class DiscountPriceCalculator implements PriceCalculator {
    private final BigDecimal discountRate;

    public DiscountPriceCalculator(BigDecimal discountRate) {
        this.discountRate = discountRate;
    }

    @Override
    public BigDecimal calculatePrice(Order order) {
        var subtotal = order.items().stream()
            .map(OrderItem::lineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return subtotal.multiply(BigDecimal.ONE.subtract(discountRate));
    }
}
```

Any method that accepts a `PriceCalculator` works with either implementation; the caller never knows or cares which one it gets.

## Abstract classes: shared state + partial implementation

An abstract class can mix concrete methods (with bodies) and abstract methods (without). It can also hold fields: something interfaces cannot do (except `static final` constants):

```
public abstract class BaseEntity {
    protected String id;
    protected java.time.LocalDateTime createdAt;

    public BaseEntity(String id) {
        this.id = id;
        this.createdAt = java.time.LocalDateTime.now();
    }

    // Concrete — subclasses inherit this as-is
    public String getId() {
        return id;
    }

    // Abstract — every subclass must provide its own
    public abstract boolean isValid();
}

public class Customer extends BaseEntity {
    private final String email;

    public Customer(String id, String email) {
        super(id);
        this.email = email;
    }

    @Override
    public boolean isValid() {
        return id != null && !id.isBlank()
            && email != null && email.contains("@");
    }
}
```

Abstract classes are for "is-a" relationships with shared wiring. `Customer` *is* a `BaseEntity`; it gets the ID and timestamp logic for free and fills in its own validation.

## Polymorphism: code to the interface

Polymorphism means one variable, many forms. When your code depends on an interface or abstract type, any subclass or implementation works at runtime:

```
// The method doesn't know which calculator it gets
public String printReceipt(Order order, PriceCalculator calc) {
    return "Total: " + calc.calculatePrice(order);
}

// Both calls compile and run correctly
printReceipt(order, new StandardPriceCalculator());
printReceipt(order, new DiscountPriceCalculator(BigDecimal.valueOf(0.10)));
```

The caller decides *which* implementation to inject. The method just uses the contract. Swap implementations without changing a line of the caller. That's the power of polymorphism..

## Interface vs abstract class: when to use which

-   **Interface**: you need a contract that any class can fulfill. A class can implement *multiple* interfaces. Prefer interfaces for defining roles or capabilities.
-   **Abstract class**: you need shared state (fields) and partial implementation across closely related types. A class can extend only *one* abstract class. Prefer abstract classes for template patterns with common wiring.

Since Java 8, interfaces can have `default` methods with bodies, so the line is blurrier. The tiebreaker: if you need instance fields, use an abstract class. Otherwise, prefer an interface for the flexibility of multiple implementation.

**Primary sources:** [Oracle: Object-Oriented Programming Concepts](https://docs.oracle.com/javase/tutorial/java/concepts/) · [Oracle: Defining an Interface](https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html) · [Oracle: Abstract Methods and Classes](https://docs.oracle.com/javase/tutorial/java/IandI/abstract.html)

## Check your understanding

<details>
<summary>1. Can a Java class implement more than one interface?</summary>
<p><strong>Correct answer:</strong> Yes: a class can implement many interfaces</p>
</details>

<details>
<summary>2. What happens if you try to instantiate an abstract class with new?</summary>
<p><strong>Correct answer:</strong> A compile-time error: abstract types cannot be instantiated</p>
</details>

<details>
<summary>3. A PriceCalculator interface defines calculatePrice. What does polymorphism let you do?</summary>
<p><strong>Correct answer:</strong> Use any implementation where the interface is expected</p>
</details>

<details>
<summary>4. When should you prefer an abstract class over an interface?</summary>
<p><strong>Correct answer:</strong> When subclasses share instance fields and common logic</p>
</details>

<details>
<summary>5. Can an interface in Java 21 contain a method with a body?</summary>
<p><strong>Correct answer:</strong> Yes: a default method provides a body</p>
</details>
