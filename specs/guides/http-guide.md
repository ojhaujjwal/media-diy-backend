# HTTP Guide

RPC patterns using @effect/rpc for type-safe HTTP APIs.

## Why RPC?

Single `/rpc` endpoint with type-safe contracts:

- One endpoint reduces HTTP complexity
- Automatic validation via Schema
- Typed errors flow through

## Request Schema

Use `TaggedRequest` for each operation:

```typescript
class UploadRequest extends S.TaggedRequest<UploadRequest>()(
  "UploadRequest",     // Tag for routing
  UploadError,         // Error type
  S.Void,              // Success type
  { id: S.UUID, ... }  // Input validation
) {}
```

**Components**:

1. Tag: Routes to handler
2. Error: Schema for error responses
3. Success: Schema for success responses
4. Fields: Input validation schema

## Router Setup

```typescript
const router = Router.make(handler1, handler2, ...)

Http.router.post("/rpc", HttpRouter.toHttpApp(router))
```

## Handler Pattern

```typescript
const handler = Rpc.effect<Request, Dependencies>(Request, (req) =>
  Effect.gen(function* () {
    const repo = yield* Repository;
    // Business logic
  }).pipe(
    Effect.catchTags({ RepositoryError: errorHandler }),
    Effect.catchAllDefect(errorHandler),
  ),
);
```

## Request Flow

1. Client POSTs to `/rpc` with `{ _tag: "RequestName", ...fields }`
2. Router dispatches by `_tag`
3. Schema validates input (validation errors → 400)
4. Handler executes (domain errors → typed response)
5. Response serialized as JSON

## Error Responses

Validation errors (400):

```json
{ "_tag": "HttpApiDecodeError", "errors": [...] }
```

Domain errors (status from annotation):

```json
{ "_tag": "UploadError", "errorCode": "MEDIA_NOT_FOUND" }
```

Unexpected errors (500):

```json
{ "_tag": "HttpServerError", "message": "..." }
```

## Testing

**Unit**: Test handler with mocked dependencies

**E2E**: Start server, create RPC client, test full flow

## Best Practices

1. Use `TaggedRequest` - enables automatic routing
2. Define error schemas - every request needs error type
3. Validate at boundary - Schema handles input validation
4. Handle errors explicitly - use `catchTags` for expected errors
5. Catch defects only in handlers - use `catchAllDefect` at HTTP boundary
6. Keep handlers thin - business logic in domain services
7. Type dependencies explicitly - Context.Tags in handler signature
