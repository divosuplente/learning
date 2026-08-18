---
title: "Lesson 5: Collections & Streams"
description: "Lesson 5: Collections & Streams"
editUrl: https://github.com/divosuplente/learning/blob/main/teaching/lessons/0005-collections-and-streams.html
---

# Collections & Streams

Every backend system moves data through structures: ordered lists, unique sets, key-value lookups. Java's Collections Framework gives you the building blocks, and the Stream API lets you transform them declaratively: **what** you want, not **how** to loop.

## List: ordered, allows duplicates

```
List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
names.add("Alice");  // allowed — duplicates OK
System.out.println(names.get(0));  // Alice

// Immutable list
List<Integer> nums = List.of(1, 2, 3, 4, 5);
```

Use `ArrayList` for fast random access. Use `LinkedList` when you frequently insert at the head. In practice, `ArrayList` is almost always the right choice.

## Set: unique elements only

```
Set<String> unique = new HashSet<>();
unique.add("Alice");
unique.add("Bob");
unique.add("Alice");  // ignored — already present
System.out.println(unique.size());  // 2

// Immutable set
Set<String> colors = Set.of("red", "green", "blue");
```

`HashSet` gives O(1) contains/add but no iteration order. `LinkedHashSet` preserves insertion order. `TreeSet` keeps elements sorted.

## Map: key-value pairs

```
Map<String, BigDecimal> pricing = new HashMap<>();
pricing.put("premium-widget", new BigDecimal("29.99"));
pricing.put("basic-widget", new BigDecimal("9.99"));
pricing.put("premium-widget", new BigDecimal("34.99"));  // overwrites previous

BigDecimal price = pricing.getOrDefault("unknown", BigDecimal.ZERO);
```

A `Map` maps keys to values. Duplicate keys overwrite; duplicate values are fine. `HashMap` is the default. `TreeMap` keeps keys sorted.

## Streams: declarative data processing

Streams turn "loop and mutate" into a pipeline of operations. Each step transforms data; the pipeline only executes when a **terminal operation** pulls results.

```
List<Order> orders = List.of(
    new Order("O001", new BigDecimal("150.00"), Status.CONFIRMED),
    new Order("O002", new BigDecimal("50.00"),  Status.PENDING),
    new Order("O003", new BigDecimal("300.00"), Status.CONFIRMED),
    new Order("O004", new BigDecimal("75.00"),  Status.CANCELLED)
);

// Filter confirmed, extract totals, sum
BigDecimal totalConfirmed = orders.stream()
    .filter(o -> o.status() == Status.CONFIRMED)
    .map(Order::total)
    .reduce(BigDecimal.ZERO, BigDecimal::add);
// 450.00
```

## The pipeline: filter → map → reduce

The most common stream pattern:

-   **filter**: keep elements matching a predicate
-   **map**: transform each element to a new value
-   **reduce**: combine all values into one result

```
// Average price of items over $20
double avg = products.stream()
    .filter(p -> p.price().doubleValue() > 20)
    .mapToDouble(p -> p.price().doubleValue())
    .average()
    .orElse(0.0);
```

## Intermediate vs terminal operations

This distinction matters:

-   **Intermediate** (`filter`, `map`, `sorted`, `distinct`, `limit`): lazy, return a new stream, do *nothing* until a terminal fires.
-   **Terminal** (`collect`, `reduce`, `forEach`, `count`, `toList`): trigger processing, produce a result.
-   **Short-circuiting** (`findFirst`, `anyMatch`, `limit`): stop as soon as the answer is known, even if elements remain.

```
// No processing happens here — filter and map are lazy
var stream = orders.stream()
    .filter(o -> o.status() == Status.CONFIRMED)
    .map(Order::total);

// Processing fires here — count() is terminal
long confirmed = stream.count();
```

A stream with no terminal operation is a no-op. Nothing runs. This trips up every Java developer at least once.

## collect with groupingBy

```
// Group orders by status
Map<Status, List<Order>> byStatus = orders.stream()
    .collect(Collectors.groupingBy(Order::status));
// {CONFIRMED=[O001, O003], PENDING=[O002], CANCELLED=[O004]}

// Count per status
Map<Status, Long> counts = orders.stream()
    .collect(Collectors.groupingBy(Order::status, Collectors.counting()));
// {CONFIRMED=2, PENDING=1, CANCELLED=1}
```

`groupingBy` is the stream equivalent of SQL's `GROUP BY`. You'll use it constantly for reporting and aggregation.

**Primary sources:** [Oracle: Collection](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collection.html) · [Oracle: java.util.stream](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/package-summary.html)

## Check your understanding

<details>
<summary>1. What happens when you add a duplicate key to a HashMap?</summary>
<p><strong>Correct answer:</strong> The new value overwrites the old value</p>
</details>

<details>
<summary>2. A stream pipeline with only intermediate operations will:</summary>
<p><strong>Correct answer:</strong> Execute nothing at all</p>
</details>

<details>
<summary>3. Which of the following is a short-circuiting terminal operation?</summary>
<p><strong>Correct answer:</strong> findFirst: stops after first match</p>
</details>

<details>
<summary>4. What does Collectors.groupingBy(Order::status) return?</summary>
<p><strong>Correct answer:</strong> A Map from each status to matching orders</p>
</details>

<details>
<summary>5. After calling stream.count(), what happens if you call stream.map(...) on the same stream reference?</summary>
<p><strong>Correct answer:</strong> It throws IllegalStateException</p>
</details>
