# Migrate all date fields from `S.Date` to Effect `DateTime` types

## Summary

Replace every `S.Date` (plain JS `Date`) field in the media domain with Effect's
`DateTime.Utc` schema types. This eliminates the current `DateTime.toDate()`
round-trip anti-pattern in the D1 persistence layer and aligns the codebase with
Effect's native time model.

**No database migration needed** — D1 columns remain `TEXT` storing ISO strings.
The wire format (RPC JSON) also stays ISO strings. Only the in-memory types
change from `Date` to `DateTime.Utc`.

## Schema choice

| Schema | Use for | Why |
|---|---|---|
| `S.DateTimeUtc` | Fields that only pass through RPC JSON codec or manual D1 conversion | Validates `DateTime.Utc` instances; JSON codec handles string ↔ `DateTime.Utc` |
| `S.DateTimeUtcFromString` | `ExifMetadata.gps.timestamp` only | Goes through manual `Schema.encodeSync`/`decodeUnknownSync` + `JSON.stringify`/`JSON.parse`; needs `Encoded = string` at AST level. Also fixes a latent round-trip bug (current `S.Date` can't decode from `JSON.parse` strings). |

## Files to change

### 1. Domain model — `src/domain/model/media.ts`

- `uploadedAt: S.Date` → `S.DateTimeUtc`
- `capturedAt: S.Date` → `S.DateTimeUtc`
- `exif.gps.timestamp: S.optional(S.Date)` → `S.optional(S.DateTimeUtcFromString)`

No new imports needed (`S` already imported).

### 2. RPC definitions — `src/http/rpc-handler/rpc-definitions.ts`

- `UploadMediaRequest` payload: `capturedAt: S.Date` → `S.DateTimeUtc`
- `SearchMediaRequest` payload: `dateFrom: S.optional(S.Date)` → `S.optional(S.DateTimeUtc)`
- `SearchMediaRequest` payload: `dateTo: S.optional(S.Date)` → `S.optional(S.DateTimeUtc)`

### 3. Response schemas (3 files)

- `src/http/request/find-media-by-id.request.ts`: `FindMediaResponse.capturedAt: S.Date` → `S.DateTimeUtc`
- `src/http/request/find-media-by-hash.request.ts`: `FindMediaByHashResponse.capturedAt: S.Date` → `S.DateTimeUtc`
- `src/http/request/search-media.request.ts`: `MediaSummary.capturedAt: S.Date` → `S.DateTimeUtc`

### 4. Repository interface — `src/domain/repository/media-metadata.repository.ts`

- Import `DateTime` type: `import { DateTime } from "effect"` (add to existing `effect` import)
- `searchMedia` criteria: `dateFrom?: Date` → `dateFrom?: DateTime.Utc`
- `searchMedia` criteria: `dateTo?: Date` → `dateTo?: DateTime.Utc`

### 5. Upload handler — `src/http/rpc-handler/upload-media.handler.ts`

- Import `DateTime`: add to existing `effect` import (`import { Clock, DateTime, Effect } from "effect"`)
- `uploadedAt: new Date(nowMs)` → `uploadedAt: DateTime.makeUnsafe(nowMs)`

(`capturedAt` is pass-through from RPC payload — no code change, type flows automatically.)

### 6. Search handler — `src/http/rpc-handler/search-media.handler.ts`

- Import `DateTime` type: `import { DateTime, Effect } from "effect"`
- Payload type annotation: `dateFrom?: Date | undefined` → `dateFrom?: DateTime.Utc | undefined`
- Payload type annotation: `dateTo?: Date | undefined` → `dateTo?: DateTime.Utc | undefined`

(Rest of handler is pass-through — no code change.)

### 7. D1 persistence — `src/infrastructure/persistence/media-metadata.d1.ts`

**Read** (`parseRowSync`):
- `uploadedAt: DateTime.toDate(DateTime.makeUnsafe(row.uploaded_at))` → `uploadedAt: DateTime.makeUnsafe(row.uploaded_at)`
- `capturedAt: DateTime.toDate(DateTime.makeUnsafe(row.captured_at))` → `capturedAt: DateTime.makeUnsafe(row.captured_at)`

**Write** (`create`):
- `metadata.capturedAt.toISOString()` → `DateTime.formatIso(metadata.capturedAt)`
- `metadata.uploadedAt.toISOString()` → `DateTime.formatIso(metadata.uploadedAt)`

**Filter** (`searchMedia`):
- `criteria.dateFrom.toISOString()` → `DateTime.formatIso(criteria.dateFrom)`
- `criteria.dateTo.toISOString()` → `DateTime.formatIso(criteria.dateTo)`

### 8. Read handlers (NO code change)

- `src/http/rpc-handler/find-media-by-id.handler.ts` — pass-through
- `src/http/rpc-handler/find-media-by-hash.handler.ts` — pass-through

Types flow automatically from `MediaMetadata` → response schema.

### 9. Tests (7 files)

#### `tests/feature/upload-media-request.test.ts`
- `capturedAt: DateTime.toDate(DateTime.nowUnsafe())` → `capturedAt: DateTime.nowUnsafe()`
- `capturedAt: new Date()` → `capturedAt: DateTime.makeUnsafe(new Date())`
- In `new MediaMetadata({...})`: `uploadedAt: DateTime.toDate(DateTime.nowUnsafe())` → `uploadedAt: DateTime.nowUnsafe()`; same for `capturedAt`

#### `tests/feature/search-media.test.ts`
- `makeMedia`: `uploadedAt`/`capturedAt: DateTime.toDate(DateTime.makeUnsafe(...))` → `DateTime.makeUnsafe(...)`
- `buildMockRepo` criteria type: `dateFrom?: Date` → `dateFrom?: DateTime.Utc`; `dateTo?: Date` → `dateTo?: DateTime.Utc`
- Add `DateTime` import (already imported)

#### `tests/feature/upload-media-end-to-end.test.ts`
- `capturedAt: new Date()` → `capturedAt: DateTime.makeUnsafe(new Date())`
- Add `DateTime` import

#### `tests/integration/rpc-smoke.integration.test.ts`
- `makeUploadPayload` return type: `capturedAt: Date` → `capturedAt: DateTime.Utc`
- `capturedAt: ... ?? DateTime.toDate(DateTime.makeUnsafe("2026-01-15T12:00:00Z"))` → `DateTime.makeUnsafe("2026-01-15T12:00:00Z")`

#### `tests/integration/search-media.integration.test.ts`
- `makeUploadPayload` return type: `capturedAt: Date` → `capturedAt: DateTime.Utc`
- All `DateTime.toDate(DateTime.makeUnsafe(...))` → `DateTime.makeUnsafe(...)`
- `SearchMediaRequest` calls: `dateFrom`/`dateTo` values → `DateTime.makeUnsafe(...)`
- **Critical**: `r.capturedAt.getTime()` → `DateTime.toEpochMillis(r.capturedAt)` (line ~264 in ORDER BY test)

#### `tests/integration/fast-scan.integration.test.ts`
- `makeUploadPayload` return type: `capturedAt: Date` → `capturedAt: DateTime.Utc`
- `capturedAt: DateTime.toDate(DateTime.makeUnsafe("2026-01-15T12:00:00Z"))` → `DateTime.makeUnsafe("2026-01-15T12:00:00Z")`

#### `typetest/rpc-payload.test.ts`
- `capturedAt: Date` → `capturedAt: DateTime.Utc` in the type assertion
- Add `import type { DateTime } from "effect"`

## Key API reference (verified in `repos/effect-smol`)

- `DateTime.makeUnsafe(input)` — accepts `number` (epoch ms), `Date`, `string`, `DateTime`. Returns `DateTime.Utc` for non-zoned inputs.
- `DateTime.formatIso(dt)` — `DateTime.Utc` → ISO 8601 string (replaces `.toISOString()`)
- `DateTime.toEpochMillis(dt)` — `DateTime.Utc` → number (replaces `.getTime()`)
- `DateTime.nowUnsafe()` — returns current `DateTime.Utc` (replaces `new Date()`)
- `S.DateTimeUtc` — validates `DateTime.Utc` instances; JSON codec maps string ↔ `DateTime.Utc`
- `S.DateTimeUtcFromString` — transformation schema: `Encoded = string`, `Type = DateTime.Utc`

## Verification

```sh
pnpm typecheck && pnpm lint && pnpm format-check && pnpm build && pnpm test
```

Integration tests require `CLOUDFLARE_API_TOKEN` env var; skip with `NO_DESTROY=1` if needed.
