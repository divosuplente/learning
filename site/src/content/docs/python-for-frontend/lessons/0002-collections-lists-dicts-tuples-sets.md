---
title: "Collections: Lists, Dicts, Tuples, Sets"
description: "Array→list, Object→dict, tuple unpacking, Set→set — the four built-in collection types mapped from JavaScript."
level: beginner
duration: "6 min"
weight: 2
---

Python has four built-in collection types where JS has two (`Array`, `Object`) plus `Map`/`Set`. Each serves a distinct role. Understanding which to reach for — and how they differ from their JS lookalikes — is 80% of day-one Python fluency.

## `Array` → `list`

```js
// JS
const nums = [1, 2, 3];
nums.push(4);
nums.map(n => n * 2);
nums.filter(n => n > 2);
nums.includes(3);
```

```python
# Python
nums = [1, 2, 3]
nums.append(4)              # push → append
[n * 2 for n in nums]       # map → comprehension (lesson 0003)
[n for n in nums if n > 2]  # filter → comprehension
3 in nums                   # includes → 'in'
```

Key differences:
- Python lists can hold mixed types (`[1, "two", None]`), like JS arrays — but in practice, data science code keeps them homogeneous.
- Negative indexing works natively: `nums[-1]` is the last element (JS needs `nums.at(-1)` or `nums[nums.length - 1]`).
- Slicing is built into the syntax:

```js
// JS
nums.slice(1, 3);  // [2, 3]
```

```python
# Python — built-in slice syntax
nums[1:3]   # [2, 3]
nums[:2]    # [1, 2]     — from start
nums[1:]    # [2, 3, 4]  — to end
nums[::2]   # [1, 3]     — step by 2
nums[::-1]  # [4, 3, 2, 1] — reverse
```

No `Array.from`, `fill`, `flatMap` — those patterns use list comprehensions or `itertools`.

## Plain object → `dict`

```js
// JS
const user = { name: "Ada", age: 36 };
user.email = "ada@example.com";
delete user.age;
Object.keys(user);
Object.values(user);
Object.entries(user);
"name" in user;  // true
```

```python
# Python
user = {"name": "Ada", "age": 36}
user["email"] = "ada@example.com"
del user["age"]
user.keys()       # dict_keys(['name', 'email'])
user.values()     # dict_values(['Ada', 'ada@example.com'])
user.items()      # dict_items([('name', 'Ada'), ('email', 'ada@example.com')])
"name" in user    # True — checks keys, not values
```

### Dict ↔ Map comparison

| JS `Map` | Python `dict` |
|----------|---------------|
| `m.set(k, v)` | `d[k] = v` |
| `m.get(k)` | `d[k]` (raises `KeyError` if missing) |
| `m.get(k, default)` | `d.get(k, default)` |
| `m.has(k)` | `k in d` |
| `m.delete(k)` | `del d[k]` |
| `m.size` | `len(d)` |
| `m.entries()` | `d.items()` |

**Safe access pattern:**

```js
// JS — optional chaining
user?.address?.city;
```

```python
# Python — .get() with default, or catch KeyError
user.get("address", {}).get("city")
```

Python dicts preserve insertion order (since 3.7, guaranteed). You rarely need `OrderedDict` anymore.

## Tuple: the frozen array

```js
// JS — no built-in immutable array
const point = Object.freeze([3, 4]);
```

```python
# Python — tuple is immutable by design
point = (3, 4)
point[0]      # 3
point[0] = 5  # TypeError: 'tuple' object does not support item assignment
```

Why tuples exist when lists cover the same ground:
- **Signal intent**: "this doesn't change" — like `readonly` arrays in TS.
- **Dict keys**: only immutable types can be dict keys. `{(1,2): "origin"}` works; `{[1,2]: "origin"}` doesn't.
- **Multiple return values**: functions commonly return tuples.

Single-element tuple needs a trailing comma: `x = (1,)` — `x = (1)` is just `1` in parentheses.

## Tuple unpacking = destructuring

```js
// JS
const [first, second, ...rest] = [1, 2, 3, 4];
const { name, age } = user;
```

```python
# Python — tuple/list unpacking
first, second, *rest = [1, 2, 3, 4]  # rest = [3, 4]

# Dict unpacking
name, age = user["name"], user["age"]

# Swap without temp variable (JS can't do this cleanly)
a, b = b, a

# Ignore values with _
first, _, third = (1, 2, 3)

# Nested unpacking
(x, y), z = (1, 2), 3  # x=1, y=2, z=3
```

The `*rest` syntax is Python's rest operator. It always produces a list.

## `Set` → `set`

```js
// JS
const tags = new Set(["js", "ts"]);
tags.add("py");
tags.has("js");
tags.delete("ts");
```

```python
# Python
tags = {"js", "ts"}    # set literal (not a dict — no colons)
tags.add("py")
"js" in tags
tags.discard("ts")     # remove that won't error if missing
```

Set operations — the real power that JS `Set` lacks:

```python
a = {1, 2, 3}
b = {2, 3, 4}

a | b    # {1, 2, 3, 4}  — union
a & b    # {2, 3}         — intersection
a - b    # {1}            — difference
a ^ b    # {1, 4}         — symmetric difference
```

**Empty set gotcha:** `{}` is an empty *dict*, not an empty set. Use `set()` for an empty set.

## Choosing the right type

| You need... | Use | JS equivalent |
|-------------|-----|---------------|
| Ordered, mutable sequence | `list` | `Array` |
| Key→value lookup | `dict` | `Object` / `Map` |
| Fixed-length, immutable sequence | `tuple` | `readonly Array` |
| Unique values, fast membership | `set` | `Set` |

## Quick reference

| JS | Python |
|----|--------|
| `[1, 2].push(3)` | `[1, 2].append(3)` |
| `arr.includes(x)` | `x in arr` |
| `arr.slice(1, 3)` | `arr[1:3]` |
| `arr.at(-1)` | `arr[-1]` |
| `{ a: 1 }` | `{"a": 1}` |
| `obj.key ?? default` | `d.get("key", default)` |
| `const [a, ...b] = arr` | `a, *b = arr` |
| `new Set([1,2])` | `{1, 2}` |
| `setA.union(setB)` | `a \| b` |

## Practice

1. Translate to Python:

```js
const scores = [85, 92, 78, 95, 88];
const high = scores.filter(s => s >= 90);
const doubled = scores.map(s => s * 2);
const has = scores.includes(78);
```

2. A function returns `(status, data)`. Write the unpacking that captures `status` and ignores `data`.

3. You need unique values from a list with O(1) lookup. Which type and why?

---

Next: [0003 — Functions, Lambdas, and Comprehensions](./0003-functions-lambdas-comprehensions)
