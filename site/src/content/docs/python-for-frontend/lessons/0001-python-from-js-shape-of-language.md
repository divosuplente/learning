---
title: "Python from JS: The Shape of the Language"
description: "Variables, types, truthiness, and indentation — how Python's surface syntax differs from JavaScript."
level: beginner
duration: "6 min"
weight: 1
---

Python reads like pseudocode that runs. No semicolons, no braces, no `let`/`const`. But the differences that trip you up aren't the obvious ones — they're the quiet behavioral shifts between languages that *look* similar.

## Variables: no declaration keyword

```js
// JS
let name = "Ada";
const PI = 3.14;
name = "Grace"; // ok — let is reassignable
```

```python
# Python — just assign
name = "Ada"
PI = 3.14
name = "Grace"  # ok — no const enforcement by default
```

No `let`/`const`/`var`. Variables spring into existence on first assignment. UPPERCASE names for constants are convention only — the interpreter won't stop you reassigning `PI`.

**Gotcha:** accessing an unassigned variable raises `NameError`, not `undefined`.

```js
// JS
console.log(x); // undefined (hoisted)
```

```python
# Python
print(x)  # NameError: name 'x' is not defined
```

## Equality: `==` vs `is`

```js
// JS — === is strict equality
1 === "1"   // false
null === undefined  // false
```

```python
# Python — == is value equality (same as JS ===)
1 == "1"    # False
None is None  # True — identity check

# 'is' checks identity (same object in memory), not value
a = [1, 2]
b = [1, 2]
a == b   # True  — same values
a is b   # False — different objects
```

Use `==` for value comparison. Use `is` only for `None` checks and singleton identity. `is` is the Python equivalent of `Object.is()` for object identity.

## `None` vs `undefined`

Python has one null value: [`None`](https://docs.python.org/3/library/constants.html#None). No `undefined`, no `null`.

```js
// JS has two "nothing" values
let x;
console.log(x);     // undefined
console.log(null);   // null
null == undefined;   // true (loose equality)
```

```python
# Python has one
x = None
print(x)  # None

# Check for None with 'is', not '=='
if x is None:
    print("nothing here")
```

`is None` is the idiomatic check — it's faster and can't be fooled by objects that override `__eq__`.

## Truthy and falsy: the landmine table

This is where JS habits bite you. The falsy values differ:

| Value | JS truthy? | Python truthy? |
|-------|-----------|----------------|
| `0` | falsy | falsy |
| `""` | falsy | falsy |
| `None` / `null` | falsy | falsy |
| `[]` | **truthy** | **falsy** |
| `{}` | **truthy** | **falsy** |
| `false` / `False` | falsy | falsy |

Empty collections are **falsy** in Python. This is the single biggest source of JS→Python bugs:

```js
// JS — empty array is truthy
if ([]) console.log("runs");  // runs!
```

```python
# Python — empty list is falsy
if []:
    print("never runs")

if [0]:
    print("runs — non-empty list is truthy")
```

Python falsy values: `None`, `False`, zero of any numeric type, empty collections (`''`, `[]`, `{}`, `set()`), and objects whose `__bool__()` or `__len__()` returns `False`/`0`.

## Types at a glance

```js
// JS
typeof 42          // "number"
typeof "hello"     // "string"
typeof [1, 2]      // "object"
typeof { a: 1 }    // "object"
typeof null        // "object" (historic bug)
```

```python
# Python
type(42)           # <class 'int'>
type(3.14)         # <class 'float'>
type("hello")      # <class 'str'>
type([1, 2])       # <class 'list'>
type({"a": 1})     # <class 'dict'>
type(None)         # <class 'NoneType'>
```

No `typeof` operator — use `type()` or `isinstance()`:

```python
isinstance(42, int)    # True
isinstance(42, (int, float))  # True — checks against a tuple of types
```

## Indentation is syntax

This isn't style — it's how Python parses blocks. No braces, no `end` keyword:

```js
// JS — braces delimit blocks
if (ready) {
  launch();
}
```

```python
# Python — indentation delimits blocks
if ready:
    launch()
```

Mixed tabs and spaces raise `TabError`. Use 4 spaces (the standard). Your editor handles this — just don't mix.

One-liners don't exist as in JS (`x ? a : b` → Python uses ternary: `a if x else b`):

```js
// JS
const label = active ? "on" : "off";
```

```python
# Python — ternary expression (notice the reversed order)
label = "on" if active else "off"
```

## String formatting: f-strings

f-strings are Python's template literals:

```js
// JS
const msg = `Hello, ${name}!`;
```

```python
# Python
msg = f"Hello, {name}!"
msg = f"2 + 2 = {2 + 2}"  # expressions inside {}
```

## Quick reference

| JS | Python |
|----|--------|
| `let x = 1` | `x = 1` |
| `const x = 1` | `x = 1` (convention: uppercase) |
| `===` | `==` |
| `Object.is(a, b)` | `a is b` |
| `undefined` / `null` | `None` |
| `typeof x` | `type(x)` |
| `` `Hello ${name}` `` | `f"Hello {name}"` |
| `x ? a : b` | `a if x else b` |
| `{ }` block | `:` + indent |

## Practice

1. Rewrite these JS snippets in Python. Two behave differently — which ones?

```js
// (a)
if ([]) console.log("a runs");
// (b)
if ("") console.log("b runs");
// (c)
if (0) console.log("c runs");
// (d)
if ({}) console.log("d runs");
```

2. Predict the output:

```python
x = None
print(x == None, x is None)
```

---

Next: [0002 — Collections: Lists, Dicts, Tuples, Sets](./0002-collections-lists-dicts-tuples-sets)
