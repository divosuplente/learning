---
title: "Functions, Lambdas, and Comprehensions"
description: "def vs function, arrow→lambda, comprehensions replacing .map().filter(), *args/**kwargs, and the mutable default argument trap."
level: beginner
duration: "7 min"
weight: 3
---

# Functions, Lambdas, and Comprehensions

Python functions look familiar but have sharper edges than JS functions. Lambdas are limited by design. Comprehensions replace the `.map().filter()` chains you write daily. And one footgun — mutable default arguments — will bite you eventually.

## `def` vs `function`

```js
// JS
function greet(name) {
  return `Hello, ${name}!`;
}

const greet = (name) => `Hello, ${name}!`;
```

```python
# Python — one way to define
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

No arrow-function shorthand for multi-statement functions. Every function is `def` + colon + indented body. The type hints (`: str`, `-> str`) are optional — like TS annotations, enforced by linters not runtime.

Default arguments work like JS:

```python
def connect(host="localhost", port=5432):
    return f"{host}:{port}"

connect()              # "localhost:5432"
connect("db.example")  # "db.example:5432"
connect(port=3306)     # "localhost:3306" — keyword args
```

## Arrow functions → lambdas (limited)

```js
// JS — arrow functions are fully featured
const double = x => x * 2;
const greet = name => `Hi ${name}`;
const add = (a, b) => a + b;
```

```python
# Python — lambda: single expression only, no statements
double = lambda x: x * 2
greet = lambda name: f"Hi {name}"
add = lambda a, b: a + b
```

**Lambdas cannot contain statements** — no `if`/`else` blocks, no `for`, no `try`, no assignment. They're intentionally limited. Python's philosophy: if it needs more than one expression, name it with `def`.

```python
# This is fine (ternary expression — still one expression)
safe_div = lambda a, b: a / b if b != 0 else 0

# This is NOT — no multi-statement lambda
# lambda x: if x > 0: return x  ← SyntaxError
```

When you'd reach for an arrow function in JS, Python idiom is usually a `def`, not a lambda.

## Comprehensions: replacing `.map().filter()`

This is the big one. Python's comprehensions replace most array method chains.

```js
// JS
const doubles = nums.map(n => n * 2);
const evens = nums.filter(n => n % 2 === 0);
const evensDoubled = nums.filter(n => n % 2 === 0).map(n => n * 2);
```

```python
# Python — list comprehension
doubles = [n * 2 for n in nums]
evens = [n for n in nums if n % 2 == 0]
evens_doubled = [n * 2 for n in nums if n % 2 == 0]
```

Order matters: `[` *expression* `for` *variable* `in` *iterable* `if` *condition* `]`. The filter comes after the `for`, the transform comes before it.

### Dict comprehensions

```js
// JS
const lengths = Object.fromEntries(
  Object.entries(words).map(([k, v]) => [k, v.length])
);
```

```python
# Python — dict comprehension
lengths = {word: len(word) for word in words}
```

### Set comprehensions

```python
# Unique word lengths
unique_lengths = {len(word) for word in words}
```

### Nested comprehensions — use sparingly

```python
# Flatten a matrix
flat = [x for row in matrix for x in row]

# Same as:
# for row in matrix:
#     for x in row:
#         ...
```

Read left-to-right: the loops nest in the order they appear. If you need three levels, write a `for` loop instead — readability beats cleverness.

## `*args` and `**kwargs`: rest and spread

```js
// JS — rest params
function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}

// spread
const merged = { ...defaults, ...overrides };
```

```python
# Python — *args packs positional into a tuple
def sum_all(*nums):
    return sum(nums)  # nums is a tuple

sum_all(1, 2, 3)  # 6

# **kwargs packs keyword into a dict
def configure(**options):
    print(options)

configure(host="db", port=5432)  # {'host': 'db', 'port': 5432}
```

### Spread equivalents: `*` and `**` unpacking

```js
// JS spread
const all = [...first, ...second];
const merged = { ...defaults, ...user };
```

```python
# Python — unpacking in literals
all = [*first, *second]            # list spread
merged = {**defaults, **user}      # dict spread

# Also works in function calls
def plot(x, y, color="blue"):
    ...

opts = {"x": 1, "y": 2, "color": "red"}
plot(**opts)  # same as plot(x=1, y=2, color="red")
```

Combined: `*args` collects, `*iterable` spreads. Same operator, different direction.

## The mutable default argument trap

This is Python's most infamous gotcha:

```python
def append_to(item, target=[]):
    target.append(item)
    return target

append_to(1)  # [1]
append_to(2)  # [1, 2]  ← WAIT. Default list is shared across calls!
append_to(3)  # [1, 2, 3]
```

The default value is created **once**, when the function is defined — not on each call. Mutable defaults (lists, dicts, sets) persist state between calls.

**Fix — use `None` as sentinel:**

```python
def append_to(item, target=None):
    if target is None:
        target = []
    target.append(item)
    return target
```

This pattern is everywhere in Python stdlib and third-party code. When you see `target=None` in a signature, it's almost always this pattern.

## Quick reference

| JS | Python |
|----|--------|
| `function f() {}` | `def f():` |
| `(x) => x * 2` | `lambda x: x * 2` |
| `arr.map(f)` | `[f(x) for x in arr]` |
| `arr.filter(f)` | `[x for x in arr if f(x)]` |
| `arr.reduce(f, init)` | `for` loop or `functools.reduce` |
| `...args` (rest) | `*args` |
| `{ ...a, ...b }` (spread) | `{**a, **b}` |
| default param `[]` | buggy — use `None` |

## Practice

1. Rewrite as a list comprehension:

```js
const results = users
  .filter(u => u.active)
  .map(u => u.name.toUpperCase());
```

2. This function has a bug. Fix it:

```python
def add_tag(item, tags=[]):
    tags.append(item)
    return tags
```

3. Write a function that accepts any number of positional arguments and returns their average.

---

Next: [0004 — Classes, Dunder Methods, and Decorators](./0004-classes-dunder-decorators)
