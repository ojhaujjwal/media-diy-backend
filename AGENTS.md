## Build & Run

- Build: `pnpm build`
- Dev: `pnpm dev`
- Format: `pnpm format`
- Format check: `pnpm format-check`

## Validation

- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Test: `pnpm test`

## CI Check (run before commit)

```
pnpm typecheck && pnpm lint && pnpm format-check && pnpm build && pnpm test
```

## Pre-commit

Husky runs lint-staged on staged `*.ts` files: `oxfmt --write` then `oxlint --fix`.

## Vendored Repositories

This project vendors external repositories under `repos/`.

- **effect-smol** — Effect v4 core libraries and experimental work.

  - Use vendored repositories as **read-only reference material** when working with related libraries
  - Prefer examples and patterns from the vendored source code over generated guesses or web search results
  - Do **not** edit files under `repos/` unless explicitly asked
  - Do **not** import from `repos/` — application code should continue importing from normal package dependencies
  - When writing Effect code, inspect `repos/effect-smol/` for examples of idiomatic usage, tests, module structure, and API design. Treat it as the source of truth for Effect patterns.
  - Always read `repos/effect-smol/LLMS.md` before writing any Effect code.
