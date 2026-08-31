---
title: "Classes, Dunder Methods, and Decorators"
description: "constructor→__init__, dunder protocol (Python's Symbol hooks), @property, decorators as HOFs, and @dataclass as your interface shorthand."
level: beginner
duration: "7 min"
weight: 4
---

Python classes look like JS classes — `class` keyword, methods, `this` (spelled `self`). But the protocol system (dunder methods) is far more central than JS's `Symbol` hooks, and decorators are a first-class feature with no JS equivalent.

## JS class → Python class

```js
// JS
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
  greet() {
    return `Hi, I'm ${this.name}`;
  }
}
```

```python
# Python
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def greet(self) -> str:
        return f"Hi, I'm {self.name}"
```

Key differences:
- `constructor` → `__init__` (a dunder method)
- `this` → `self` — and it must be the first parameter of every method (Python doesn't auto-bind it)
- No semicolons, no braces, `def` for methods
- No `new` keyword — `User("Ada", "ada@dev.io")` creates an instance

## Dunder methods: Python's `Symbol` hooks

JS uses `Symbol.iterator`, `Symbol.toStringTag`, `Symbol.toPrimitive` to hook into language behavior. Python uses `__dunder__` methods — same idea, but there are dozens of them and they're central to every class you'll write.

| JS Symbol | Python dunder | Purpose |
|-----------|---------------|---------|
| `toString()` | `__str__` | Human-readable string (`print()`, `str()`) |
| — | `__repr__` | Developer-readable string (debugger, REPL) |
| `Symbol.iterator` | `__iter__` + `__next__` | Make an object iterable |
| `valueof()` / `Symbol.toPrimitive` | `__int__`, `__float__`, `__bool__` | Type conversion |
| `length` property | `__len__` | `len(obj)` |
| `[key]` access | `__getitem__`, `__setitem__` | `obj[key]` |
| `===` operator | `__eq__` | `obj1 == obj2` |
| `+` operator | `__add__` | `obj + other` |

### `__str__` vs `__repr__`

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):          # like toString() — for users
        return f"({self.x}, {self.y})"

    def __repr__(self):         # for developers — unambiguous, ideally eval-able
        return f"Point({self.x}, {self.y})"

p = Point(1, 2)
print(p)       # (1, 2)       — calls __str__
repr(p)        # Point(1, 2)  — calls __repr__
```

Rule of thumb: always write `__repr__`. Only write `__str__` if the user-facing format should differ.

### Making an object work with `len()`, `in`, and iteration

```js
// JS — Symbol.iterator
class NumberRange {
  *[Symbol.iterator]() {
    for (let i = this.start; i < this.end; i++) yield i;
  }
}
```

```python
# Python — __len__, __contains__, __iter__
class NumberRange:
    def __init__(self, start, end):
        self.start = start
        self.end = end

    def __len__(self):
        return self.end - self.start

    def __contains__(self, n):
        return self.start <= n < self.end

    def __iter__(self):
        return iter(range(self.start, self.end))

r = NumberRange(1, 5)
len(r)     # 4
3 in r     # True
list(r)    # [1, 2, 3, 4]
```

## `@property`: computed properties

```js
// JS — getter
class Circle {
  get circumference() {
    return 2 * Math.PI * this.radius;
  }
}
```

```python
# Python — @property
class Circle:
    def __init__(self, radius):
        self.radius = radius

    @property
    def circumference(self) -> float:
        return 2 * 3.14159 * self.radius

c = Circle(5)
c.circumference  # 31.4159 — accessed like an attribute, not a method
```

## `@staticmethod` and `@classmethod`

```js
// JS — static methods only
class User {
  static fromJSON(json) {
    return new User(json.name, json.email);
  }
}
```

```python
# Python — two kinds of "static"
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        return cls(data["name"], data["email"])

    @staticmethod
    def is_valid_email(email: str) -> bool:
        return "@" in email and "." in email.split("@")[1]

User.from_dict({"name": "Ada", "email": "a@b.com"})
User.is_valid_email("a@b.com")
```

- `@classmethod` — receives the class (`cls`) as first arg. Used for alternative constructors (like factory methods). Subclass-friendly — `cls` is the actual class called on.
- `@staticmethod` — no implicit first arg. A function that lives in the class namespace for organizational reasons.

## Decorators: higher-order functions at definition time

No direct JS equivalent. A decorator wraps a function at the point it's defined:

```python
def log_call(fn):
    def wrapper(*args, **kwargs):
        print(f"Calling {fn.__name__}")
        return fn(*args, **kwargs)
    return wrapper

@log_call          # this:
def greet(name):   #   greet = log_call(greet)
    return f"Hi {name}"

greet("Ada")  # prints "Calling greet", returns "Hi Ada"
```

A decorator is just a function that takes a function and returns a function — applied with `@` syntax. The `@log_call` line is exactly `greet = log_call(greet)`.

Common built-in decorators you'll see in data science code:
- `@property` — computed attribute
- `@staticmethod` / `@classmethod` — method types
- `@dataclass` — auto-generate `__init__`, `__repr__`, `__eq__`
- `@functools.lru_cache` — memoization (like a Map-based cache)

## `@dataclass`: your interface + constructor shorthand

```ts
// TS — interface + class
interface Config {
  host: string;
  port: number;
  debug?: boolean;
}

class Config {
  constructor(
    public host: string,
    public port: number,
    public debug = false
  ) {}
}
```

```python
# Python — @dataclass does it all
from dataclasses import dataclass

@dataclass
class Config:
    host: str
    port: int
    debug: bool = False

c = Config("localhost", 5432)
c           # Config(host='localhost', port=5432, debug=False) — __repr__ free
c == Config("localhost", 5432)  # True — __eq__ free
```

`@dataclass` auto-generates `__init__`, `__repr__`, and `__eq__`. Add `frozen=True` for immutability (like TS `readonly`):

```python
@dataclass(frozen=True)
class Point:
    x: float
    y: float
```

You'll see `@dataclass` everywhere in ML code — model configs, hyperparameters, training settings.

## Quick reference

| JS | Python |
|----|--------|
| `constructor()` | `__init__(self)` |
| `this` | `self` (explicit first param) |
| `toString()` | `__str__()` / `__repr__()` |
| `Symbol.iterator` | `__iter__()` |
| `get prop()` | `@property` |
| `static method()` | `@staticmethod` / `@classmethod` |
| interface + class | `@dataclass` |
| HOF wrapper | `@decorator` |
| `new ClassName()` | `ClassName()` (no `new`) |

## Practice

1. Write a `Vector` class with `__add__`, `__len__`, `__repr__`, and a `@property` for `magnitude`.

2. Rewrite this TS as a `@dataclass`:

```ts
interface ModelConfig {
  model: string;
  lr: number;
  epochs: number;
  batchSize?: number;
}
```

3. A decorator `@retry(n)` that re-runs a function up to `n` times on `Exception`. Hint: it needs to be a decorator factory (a function that returns a decorator).

---

Next: [0005 — Modules, Packages, and venv](./0005-modules-packages-venv)
