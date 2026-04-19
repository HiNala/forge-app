# Ruff — Reference for Forge

**Version:** 0.8.x
**Last researched:** 2026-04-19

## What Forge Uses

Ruff as the sole Python linter and formatter. Replaces Black, Flake8, isort, and pyupgrade in a single tool.

## Configuration

```toml
# ruff.toml (at apps/api root)
target-version = "py312"
line-length = 100

[lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "N",    # pep8-naming
    "UP",   # pyupgrade
    "B",    # flake8-bugbear
    "SIM",  # flake8-simplify
    "C4",   # flake8-comprehensions
    "PT",   # flake8-pytest-style
    "RUF",  # ruff-specific rules
]
ignore = [
    "E501",   # line too long (formatter handles this)
    "B008",   # do not perform function calls in argument defaults (FastAPI Depends)
]

[lint.isort]
known-first-party = ["app"]

[format]
quote-style = "double"
indent-style = "space"
```

## Commands

```bash
# Check lint
ruff check .

# Fix auto-fixable issues
ruff check --fix .

# Format code
ruff format .

# Check formatting (CI)
ruff format --check .
```

## Known Pitfalls

1. **B008 must be ignored**: FastAPI's `Depends()` in default arguments triggers this. It's intentional.
2. **Formatter + linter**: Run both. `ruff check` + `ruff format`.
3. **isort via Ruff**: Don't install isort separately. Ruff handles it with the `I` rule set.

## Links
- [Ruff Docs](https://docs.astral.sh/ruff/)
- [Rule Reference](https://docs.astral.sh/ruff/rules/)
