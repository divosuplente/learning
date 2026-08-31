---
title: "Generics"
description: "Generics"
editUrl: https://github.com/divosuplente/learning/blob/main/site/src/content/docs/lessons/00-java-foundations/0003-generics.md
---

Without generics, collections held `Object` and you cast on retrieval. Bugs surfaced at runtime, not compile time. Generics let you write **type-safe, reusable code** where the compiler catches mismatches before the program runs.

## A generic class

```
class Box<T> {
    private final List<T> items = new ArrayList<>();

    public void add(T item) { items.add(item); }
    public T get(int index)    { return items.get(index); }
    public int size()          { return items.size(); }
}
```

`Box<String>` only accepts strings; `Box<Integer>` only accepts integers. The wrong type is a compile error, not a runtime `ClassCastException`.

```
Box<String> sb = new Box<>();
sb.add("hello");  // ✅
sb.add(42);       // ❌ compile-time error
```

## Bounded type parameters

Constrain `T` to a hierarchy with `extends`:

```
public class Statistics<T extends Number> {
    private final List<T> data = new ArrayList<>();

    public void add(T value) { data.add(value); }

    public double average() {
        double sum = 0;
        for (T n : data) {
            sum += n.doubleValue(); // Number method — available because T extends Number
        }
        return sum / data.size();
    }
}
```

Without the bound, the compiler wouldn't know `T` has `doubleValue()`. The bound makes that method available and prevents `Statistics<String>` from compiling.

## Wildcards and PECS

Wildcards make generic APIs flexible. The mnemonic is **PECS**: *Producer Extends, Consumer Super*.

```
// Reading from the list (it "produces" values) → ? extends T
public double sumAll(List<? extends Number> numbers) {
    double sum = 0;
    for (Number n : numbers) { sum += n.doubleValue(); }
    return sum;
}

// Writing to the list (it "consumes" values) → ? super T
public void addIntegers(List<? super Integer> list) {
    for (int i = 1; i <= 10; i++) { list.add(i); }
}
```

`? extends Number` lets you read `Number` safely but you **cannot add**; you don't know whether the list holds `Integer`, `Double`, or something else. `? super Integer` lets you add `Integer` safely but you can only read `Object`. If you need to read *and* write, don't use a wildcard: use `<T>`.

## Type erasure

Generics exist only at compile time. At runtime, `Box<String>` and `Box<Integer>` are both just `Box`. This is **type erasure**:

```
Box<String> a = new Box<>();
Box<Integer> b = new Box<>();
System.out.println(a.getClass() == b.getClass()); // true — both are Box.class
```

Consequences: you **cannot** write `new T()`, `T.class`, or `instanceof T`. If you need the class at runtime, pass it explicitly:

```
public <T> List<T> filterByType(List<?> items, Class<T> type) {
    List<T> result = new ArrayList<>();
    for (Object item : items) {
        if (type.isInstance(item)) { result.add(type.cast(item)); }
    }
    return result;
}
```

**Primary source:** [Oracle: Generics (Java Tutorials)](https://docs.oracle.com/javase/tutorial/java/generics/)

## Check your understanding

<details>
<summary>1. What is the main benefit of generics over using Object with casts?</summary>
<p><strong>Correct answer:</strong> Type errors are caught at compile time instead of runtime</p>
</details>

<details>
<summary>2. Given class Stats, why does T.doubleValue() compile?</summary>
<p><strong>Correct answer:</strong> The bound guarantees T is a Number, which defines doubleValue</p>
</details>

<details>
<summary>3. A method reads values from List. Why can't it add an Integer to the list?</summary>
<p><strong>Correct answer:</strong> The actual list might be List<double>, which rejects Integer</double></p>
</details>

<details>
<summary>4. List can hold which of these as actual list types?</summary>
<p><strong>Correct answer:</strong> List<integer>, List<number>, and List<object>: Integer or supertypes<p></p></object></number></integer></p>
</details>

<details>
<summary>5. Why does new T() fail inside a generic class Box?</summary>
<p><strong>Correct answer:</strong> Type erasure removes T at runtime, so the JVM cannot know which constructor to call</p>
</details>
