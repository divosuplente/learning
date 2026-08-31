---
title: "Modules, Packages, and venv"
description: "import/export → import, node_modules → venv, npm → pip, package.json → pyproject.toml — the ecosystem mapped from Node."
level: beginner
duration: "7 min"
weight: 5
---

Every Python file is a module. Every directory with `__init__.py` is a package. venv is your per-project `node_modules`. `pip` is your `npm`. The mental model maps cleanly — but the defaults differ in ways that matter.

## `import`/`export` → `import`

```js
// JS — named exports
// utils.js
export function add(a, b) { return a + b; }
export const PI = 3.14;

// consumer
import { add, PI } from "./utils.js";
```

```python
# Python — every file is importable (no export keyword)
# utils.py
def add(a, b):
    return a + b

PI = 3.14

# consumer
from utils import add, PI        # same directory
from myapp.utils import add, PI  # package import
```

No `export` keyword — anything defined at module scope is importable. This means Python has no concept of "public API" at the language level. Convention: prefix private names with `_` (e.g., `_internal_helper`).

### Import styles

```python
import os                          # full module — access as os.path.join(...)
from os.path import join           # specific name — access as join(...)
from os.path import join as pjoin  # rename on import
import numpy as np                 # conventional alias (everyone uses np)
```

**Avoid `from module import *`** — it dumps everything into your namespace, making it unclear where names come from and risking collisions. The only widely accepted wildcard import is `from __future__ import annotations`.

### `__init__.py` — the package marker

```
myapp/
├── __init__.py      # makes myapp a package
├── models.py
└── services/
    ├── __init__.py  # makes services a subpackage
    └── auth.py
```

`__init__.py` can be empty (just marks the directory as a package) or can re-export names for cleaner imports:

```python
# myapp/__init__.py
from myapp.models import User  # allows: from myapp import User
```

## `node_modules` → `venv`

```js
// JS — dependencies land in node_modules/
npm install lodash
// → node_modules/lodash/...
```

```python
# Python — dependencies land in a virtual environment
python -m venv .venv             # create (one-time)
source .venv/bin/activate        # activate (every new terminal)
pip install requests             # install into .venv, not global Python
```

Why venv exists: Python is a system language. Your OS relies on it. Installing packages globally can break system tools. `venv` creates an isolated environment with its own Python binary and package directory — per project, no collisions.

| Concept | Node | Python |
|---------|------|--------|
| Isolated deps | `node_modules/` | `.venv/` |
| Create | `npm init` | `python -m venv .venv` |
| Activate | `cd` into project | `source .venv/bin/activate` |
| Deactivate | `cd` out | `deactivate` |
| Lockfile | `package-lock.json` | `requirements.txt` or `uv.lock` |

### The `.venv` directory

Never commit `.venv/` to git — add it to `.gitignore`. It's the `node_modules` equivalent: reproducible from your dependency spec.

## `npm` → `pip` (and `uv`)

```bash
# pip — the npm of Python
pip install requests           # install a package
pip install requests==2.31.0   # install specific version
pip install -r requirements.txt # install from lockfile
pip list                        # list installed packages
pip show requests               # package details
```

### `pip` vs `pipx` vs `uv`

| Tool | Purpose | JS equivalent |
|------|---------|---------------|
| `pip` | Install libraries into a venv | `npm install` |
| `pipx` | Install CLI tools globally in isolated envs | `npx` / `npm -g` |
| `uv` | Fast pip+venv replacement (Rust-based) | `pnpm` / `bun` |

`uv` has been gaining rapid adoption — it's 10–100× faster than pip, handles venv creation, and can replace both `pip` and `pip-tools`. If you're starting fresh, use `uv`. If you're reading existing projects, you'll see `pip`.

```bash
# uv — the modern way
uv init myproject        # create project (replaces npm init)
uv add requests          # add dependency (replaces npm install + package.json edit)
uv run python main.py    # run in the project venv
uv sync                  # install all deps from lockfile
```

## `package.json` → `pyproject.toml`

```json
// package.json
{
  "name": "myapp",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "scripts": {
    "dev": "node server.js"
  }
}
```

```toml
# pyproject.toml
[project]
name = "myapp"
version = "1.0.0"
dependencies = [
    "requests>=2.31.0",
    "rich>=13.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "ruff>=0.1.0",
]

[project.scripts]
dev = "myapp.server:main"
```

You'll also see `requirements.txt` in older projects — a simpler flat list:

```
requests>=2.31.0
rich>=13.0.0
```

`pyproject.toml` is the modern standard (PEP 621). `requirements.txt` still works and is common in data science projects for its simplicity.

## `PYTHONPATH` and `sys.path`

```js
// JS — module resolution
// 1. Node built-ins
// 2. node_modules/ (walk up directories)
// 3. File-relative imports
```

```python
# Python — module resolution
import sys
print(sys.path)
# ['',                              # current directory
#  '/usr/lib/python3.13',           # stdlib
#  '/path/to/.venv/lib/...']        # venv site-packages
```

`PYTHONPATH` is an environment variable that prepends directories to `sys.path` — like setting `NODE_PATH`. You rarely need it; proper package structure and venv activation handle most import resolution.

If you get `ModuleNotFoundError`, check:
1. Is the venv activated?
2. Is the package installed? (`pip list`)
3. Is the module in the right directory? (file-relative vs package import)
4. Are you running from the project root?

## Common workflow

```bash
# Starting a project — pip way
python -m venv .venv
source .venv/bin/activate
pip install requests pandas
pip freeze > requirements.txt

# Starting a project — uv way (faster, all-in-one)
uv init myproject
cd myproject
uv add requests pandas

# Running scripts
source .venv/bin/activate   # pip
python main.py

uv run python main.py       # uv — auto-activates venv
```

## Quick reference

| JS/Node | Python |
|---------|--------|
| `export const x = 1` | `x = 1` (auto-exported) |
| `import { x } from "./mod"` | `from mod import x` |
| `import * as mod from "./mod"` | `import mod` |
| `node_modules/` | `.venv/` |
| `npm install` | `pip install` / `uv add` |
| `package.json` | `pyproject.toml` |
| `package-lock.json` | `requirements.txt` / `uv.lock` |
| `npx` | `pipx` |
| `NODE_PATH` | `PYTHONPATH` / `sys.path` |

## Practice

1. Create a project with this structure. Make the imports work:

```
myproject/
├── __init__.py
├── main.py
└── utils/
    ├── __init__.py
    └── helpers.py
```

`main.py` should import a function from `utils/helpers.py`. What are two ways to write that import?

2. You clone a project with a `requirements.txt`. What are the exact commands to set up and run it?

3. A teammate says "just set `PYTHONPATH` to fix the import." Why is this likely the wrong fix? What should they do instead?

---

Next: [0006 — NumPy: The Array That Changed Python](0006-numpy-array/)
