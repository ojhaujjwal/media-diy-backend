# Fix Typecheck Errors

## Summary

4 source files need code fixes (Effect-LS rules correctly flagging impure globals inside `Effect.gen`). 31 test violations across 8 test files need an override block — the rules are too strict for test code where `crypto.randomUUID()`, `new Date()`, `process.env`, `node:*`, and `fetch()` are legitimate patterns.

---

## FIX: Source code (4 files)

### 1. `src/http/rpc-handler/generate-upload-presigned-url.handler.ts`

**Problem**: `generateFileName()` uses `new Date()` and `crypto.randomUUID()` outside `Effect.gen`, then is called from within the gen block. Triggers `globalDateInEffect` + `cryptoRandomUUIDInEffect`.

**Fix**: Remove `generateFileName` helper. Move the logic into the `Effect.gen` block using `Clock.currentTimeMillis` and `Random.next`.

### 2. `src/http/rpc-handler/upload-media.handler.ts`

**Problem**: `uploadedAt: new Date()` inside `Effect.gen`. Triggers `globalDateInEffect`.

**Fix**: Use `yield* Clock.currentTimeMillis` then `new Date(ms)`.

### 3. `src/infrastructure/persistence/media-contents.r2.ts`

**Problem**: `process.env.R2_*` reads at module scope. Triggers `processEnv`. The `worker.ts` already uses the correct `Config.string` / `Config.redacted` pattern.

**Fix**: Move env reads into the `Effect.gen` block using `yield* Config.string("R2_ACCESS_KEY_ID")` etc.

### 4. `tests/integration/fixtures/stack.ts`

**Problem**: `process.env.CLOUDFLARE_ACCOUNT_ID` at module scope. Triggers `processEnv`.

**Fix**: Move inside the `Effect.gen` block with `Config.string`.

---

## IGNORE: Test overrides (tsconfig.json)

Add an override block in the Effect Language Service plugin's `overrides` array (alongside the existing `strictEffectProvide: "off"` for tests) that disables these rules for `tests/**/*.ts`:

```
processEnv, processEnvInEffect, globalDate, globalDateInEffect,
globalRandom, globalRandomInEffect, cryptoRandomUUID, cryptoRandomUUIDInEffect,
nodeBuiltinImport, globalFetch, globalFetchInEffect
```

These are legitimate patterns in test code — unique test IDs, dates in fixtures, CI tokens, reading fixture files from disk, HTTP calls against deployed workers. This will cover the 31 violations across:
- `tests/feature/upload-media-end-to-end.test.ts`
- `tests/feature/upload-media-request.test.ts`
- `tests/feature/search-media.test.ts`
- `tests/integration/presigned-url.integration.test.ts`
- `tests/integration/rpc-smoke.integration.test.ts`
- `tests/integration/search-media.integration.test.ts`
- `tests/integration/fast-scan.integration.test.ts`

---

## Verification

```
pnpm typecheck
```

Should produce zero errors.
