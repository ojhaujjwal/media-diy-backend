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

## Alchemy Integration Test Patterns

For integration tests that deploy to Cloudflare, use `alchemy/Test/Vitest`'s `Test.make` pattern. Never manually call `Effect.runPromise` on alchemy stack effects — the test framework provides all required services internally.

```typescript
import * as Cloudflare from "alchemy/Cloudflare";
import * as Test from "alchemy/Test/Vitest";
import Stack from "./fixtures/stack.js";

const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
  providers: Cloudflare.providers(),
  stage: "test"
});

const stack = beforeAll(deploy(Stack), { timeout: 180_000 });
afterAll.skipIf(process.env.NO_DESTROY !== undefined)(destroy(Stack), { timeout: 180_000 });

test("my test", Effect.gen(function* () {
  const { url, bucketName, databaseId } = yield* stack;
  // ... test body ...
}));
```

- Reference patterns: `alchemy-effect/packages/alchemy/src/Test/` and `alchemy-effect/packages/alchemy/test/`
- `deploy()` returns the stack's output via `beforeAll`, accessible as `yield* stack`
- `destroy()` handles teardown; skip with `afterAll.skipIf(process.env.NO_DESTROY !== undefined)`
- The framework provides all alchemy services; tests never need `as` casts to run effects

## Type Narrowing (no `as` type assertions)

- **Never use `as` type assertions.** The project's `consistent-type-assertions: "never"` rule blocks all `as` usage.
- Use `Schema.decodeUnknown` / `Schema.decodeUnknownSync` to parse `unknown` into concrete types.
- Use `Schema.decodeUnknown` with `Effect.flatMap` for Effect-based parsing, or `Schema.decodeUnknownSync` for sync narrowing in tests.
- For intentionally-invalid test data, test Schema validation directly rather than trying to pass invalid types through typed APIs.

```typescript
// Decode unknown rows from D1 into typed structs
const rows = S.decodeUnknownSync(S.Array(S.Struct({ id: S.String })))(
  yield* queryAll(accountId, databaseId, sql)
);
```

## Effect API Verification

- Before using any Effect function, **verify it exists** by searching `repos/effect-smol/packages/effect/src/` for the function name. Never assume an API exists.
  - `Layer.scoped` does **not** exist — use `Layer.effect` or `Layer.effectDiscard`.
  - `Context.Service` syntax: `Context.Service<Self, Type>()("identifier")` — not the reverse.
- When providing requirements, provide them explicitly with `Layer.effect` / `Layer.provide` rather than using type assertions to erase them.
