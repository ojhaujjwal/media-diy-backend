# Error Handling

Error handling strategy using Effect-TS.

## Architecture

Single layer: Domain errors flow directly to RPC responses.

```
Domain Errors (TaggedError) → RPC Responses
```

## Error Types

### Domain Errors

Repository-level errors using `Data.TaggedError`:

- `MediaMetadataRepositoryError` - DynamoDB failures
- `MediaContentsRepositoryError` - S3 failures

### RPC Errors

Client-facing errors using `Schema.TaggedError`:

- `UploadMediaError` - Upload failures with error codes
- Error codes: `MEDIA_NOT_FOUND`, `UPLOAD_FAILED`, `INVALID_FORMAT`

## Patterns

### Let Errors Flow

Most errors flow through without transformation:

```typescript
yield * repository.findById(id); // Errors propagate to caller
```

### Transform When Needed

Map domain errors to API errors at boundaries:

```typescript
.pipe(
  Effect.catchTags({
    RepositoryError: (e) => Effect.fail(new ApiError(...))
  })
)
```

### Fallback Values

Provide defaults for expected failures:

```typescript
.pipe(
  Effect.catchTag("NotFoundError", () => Effect.succeed(null))
)
```

### Handler Pipeline

HTTP handlers catch both expected and unexpected errors:

```typescript
.pipe(
  Effect.catchTags({ RepositoryError: handler }),
  Effect.catchAllDefect(handler)  // Bugs → 500 errors
)
```

## Anti-Patterns

**Don't use `catchAllCause`** - catches bugs that should crash

**Don't silently swallow** - always propagate or transform

**Don't use global Error** - use tagged errors for type safety

## Error Flow Example

Upload flow:

1. Validation error → 400
2. S3 error → RepositoryError → UploadError
3. DynamoDB error → RepositoryError → UploadError
4. Success → 200
5. Unexpected → 500
