# Upload Media Client Implementation Plan

## Status

**IMPLEMENTED** - All tasks completed.

## Overview

Build an upload client that scans a directory for media files and uploads them to the server via RPC, using SHA-256 content hashing for deduplication. The server checks for existing hashes to skip already-uploaded files.

---

## Clarifications

1. **Server URL**: Local only, configurable via CLI `--server-url` option (default: `http://localhost:3000/rpc`)
2. **File extensions**: Case-insensitive matching (e.g., `.JPG` and `.jpg` both accepted)
3. **Uploads**: Concurrent uploads enabled for performance

---

## Server-side Changes

### 1. Update Media Model

**File:** `src/domain/model/media.ts`

Rename `md5Hash` to `sha256Hash`:

```typescript
sha256Hash: S.String,
```

### 2. Add DynamoDB GSI for sha256Hash

**File:** `bin/setup-dynamo-table`

Add Global Secondary Index for hash queries:

```bash
--global-secondary-indexes \
    '[{
      "IndexName": "Sha256HashIndex",
      "KeySchema": [{"AttributeName": "GSI1PK", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "KEYS_ONLY"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }]'
```

Note: Items must include `GSI1PK: {S: `Hash-${sha256Hash}`}` attribute.

### 3. Update Repository Interface

**File:** `src/domain/repository/media-metadata.repository.ts`

Add method:

```typescript
readonly findByHash: (sha256Hash: string) => Effect.Effect<
  MediaMetadata,
  MediaMetadataRepositoryError<FindByIdErrorReason>
>
```

### 4. Update Repository Implementation

**File:** `src/infrastructure/persistence/media-metadata.repository.live.ts`

- Store `GSI1PK: {S: `Hash-${sha256Hash}`}` when creating items
- Implement `findByHash` using GSI query

### 5. Update UploadMediaRequest

**File:** `src/http/request/upload-media.request.ts`

Rename `md5Hash` to `sha256Hash` in payload.

### 6. Update Upload Handler

**File:** `src/http/rpc-handler/upload-media.handler.ts`

Update to use `sha256Hash` instead of `md5Hash`.

### 7. Add FindMediaByHashRequest

**File:** `src/http/request/find-media-by-hash.request.ts` (new)

```typescript
export class FindMediaByHashError extends S.TaggedError<FindMediaByHashError>()(
  "FindMediaByHashError",
  { errorCode: S.Enums(ERROR_CODE) },
) {}

export class FindMediaByHashRequest extends S.TaggedRequest<FindMediaByHashRequest>()(
  "FindMediaByHashRequest",
  {
    failure: FindMediaByHashError,
    success: MediaMetadata,
    payload: { sha256Hash: S.String },
  },
) {}
```

### 8. Add FindMediaByHash Handler

**File:** `src/http/rpc-handler/find-media-by-hash.handler.ts` (new)

Implement handler that queries by sha256Hash using GSI.

### 9. Register New RPC

**File:** `src/http/rpc-handler/rpc-definitions.ts`

Add `FindMediaByHashRequest` to the RPC group and export it.

### 10. Update Existing Handlers/Requests

- `src/http/request/find-media-by-id.request.ts` - rename md5Hash to sha256Hash if present
- `src/http/rpc-handler/find-media-by-id.handler.ts` - update field references

---

## Client-side Changes

### 11. Create CLI Script

**File:** `src/cli/upload-media-client.ts` (new)

Dependencies:

- `@effect/cli` - argument parsing
- `@effect/platform` + `@effect/platform-node` - filesystem operations
- `@effect/rpc` - RPC client
- `crypto` (Node built-in) - SHA-256 hashing

CLI Options:

- `directory` - positional argument (required)
- `--device-id` - required option
- `--server-url` - optional, default `http://localhost:3000/rpc`
- `--dry-run` - flag to preview without uploading
- `--concurrency` - number of concurrent uploads, default 5

Flow:

```
For each file in directory recursively:
  1. Check extension (case-insensitive) → skip if not in FILE_EXTENSION_MAPPING
  2. Compute SHA-256 hash
  3. Call FindMediaByHashRequest(sha256Hash)
  4. If found → log "skipped (already uploaded)" → continue
  5. If NOT_FOUND:
     a. Get file stats (mtime for capturedAt)
     b. Generate UUID
     c. Call UploadMediaRequest
     d. Log success/error
```

### 12. Add Package Script

**File:** `package.json`

```json
"scripts": {
  "upload": "tsx src/cli/upload-media-client.ts"
}
```

---

## File Summary

### Modified Files

| File                                                               | Changes                               | Status  |
| ------------------------------------------------------------------ | ------------------------------------- | ------- |
| `src/domain/model/media.ts`                                        | Rename md5Hash → sha256Hash           | ✅ Done |
| `src/domain/repository/media-metadata.repository.ts`               | Add findByHash method                 | ✅ Done |
| `src/infrastructure/persistence/media-metadata.repository.live.ts` | Add GSI support, implement findByHash | ✅ Done |
| `src/http/request/upload-media.request.ts`                         | Rename md5Hash → sha256Hash           | ✅ Done |
| `src/http/rpc-handler/upload-media.handler.ts`                     | Use sha256Hash                        | ✅ Done |
| `src/http/rpc-handler/find-media-by-id.handler.ts`                 | Update field references               | ✅ Done |
| `src/http/rpc-handler/rpc-definitions.ts`                          | Register FindMediaByHashRequest       | ✅ Done |
| `bin/setup-dynamo-table`                                           | Add GSI configuration                 | ✅ Done |

### New Files

| File                                                 | Description                   | Status  |
| ---------------------------------------------------- | ----------------------------- | ------- |
| `src/http/request/find-media-by-hash.request.ts`     | FindMediaByHashRequest schema | ✅ Done |
| `src/http/rpc-handler/find-media-by-hash.handler.ts` | Handler implementation        | ✅ Done |
| `src/cli/upload-media-client.ts`                     | CLI upload client             | ✅ Done |

### Test Files Updated

| File                                            | Changes                     | Status  |
| ----------------------------------------------- | --------------------------- | ------- |
| `tests/feature/upload-media-request.test.ts`    | Update md5Hash → sha256Hash | ✅ Done |
| `tests/feature/upload-media-end-to-end.test.ts` | Update md5Hash → sha256Hash | ✅ Done |

---

## Testing Strategy

1. **Unit tests** for `findByHash` repository method
2. **Integration test** for `FindMediaByHashRequest` RPC
3. **E2E test** for client:
   - Upload a file
   - Verify it's skipped on second run
   - Verify hash is stored correctly
