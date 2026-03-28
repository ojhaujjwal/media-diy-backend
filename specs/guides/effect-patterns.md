# Effect Patterns Guide

Principles and patterns for using Effect-TS in this codebase.

## Critical Rules

### 1. Never Use `any` or Type Casts

Use proper types. If you need to parse unknown data, use `Schema.decodeUnknown`.

### 2. Never Use Global `Error` in Effect Error Channel

Always use tagged errors:

```typescript
class MyError extends Data.TaggedError("MyError")<{ message: string }>() {}
Effect<Result, MyError>; // ✅
```

### 3. Don't Wrap Safe Operations in Effect

Pure functions don't need Effect. Use Effect only for operations that can fail or require context.

### 4. Never Use `catchAllCause`

Use `catchTags` for expected errors. Defects (bugs) should not be caught.

## Core Patterns

### Service Definition

Define service as interface + Context.Tag:

```typescript
interface MyService {
  readonly doSomething: (input: Input) => Effect<Result, MyError>;
}

class MyService extends Context.Tag("MyService")<MyService, MyService>() {}
```

### Layer Creation

Provide implementation via Layer:

```typescript
const MyServiceLive = Layer.effect(MyService, Effect.gen(function* () {
  const dep = yield* Dependency
  return { doSomething: (input) => /* impl */ }
}))
```

### Layer Composition

Merge all layers at composition root (`src/layers.ts`):

```typescript
const AppLayer = Layer.mergeAll(
  PrettyLogger.layer({}),
  RepositoryLive,
  ServiceLayer,
);
```

Provide to program:

```typescript
program.pipe(Effect.provide(AppLayer));
```

## Schema Patterns

### Entities

Use `Schema.Class` for domain entities - provides automatic Equal/Hash:

```typescript
class MediaMetadata extends Schema.Class<MediaMetadata>("MediaMetadata")({
  id: Schema.UUID,
  // ... fields
}) {}
```

### RPC Requests

Use `TaggedRequest` for RPC endpoints:

```typescript
class UploadRequest extends S.TaggedRequest<UploadRequest>()(
  "UploadRequest",     // Tag for routing
  UploadError,         // Error schema
  S.Void,              // Success schema
  { id: S.UUID, ... }  // Request fields
) {}
```

### Errors

Use `TaggedError` with HTTP annotations:

```typescript
class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  { id: Schema.UUID },
  HttpApiSchema.annotations({ status: 404 }),
) {}
```

## Error Handling

Let errors flow through unless transformation needed:

```typescript
// Let flow through
yield* repository.findById(id)

// Transform when needed
Effect.catchTags({
  RepositoryError: (e) => Effect.fail(new ApiError({ ... }))
})
```

Use pipeline for handler error handling:

```typescript
.pipe(
  Effect.catchTags({ RepositoryError: handler }),
  Effect.catchAllDefect(handler)  // Only in HTTP handlers
)
```

## Pipe Composition

Chain operations with `.pipe()`:

```typescript
effect
  .pipe(Effect.map(transform))
  .pipe(Effect.flatMap(next))
  .pipe(Effect.catchTag("Error", handle));
```

Use `Effect.gen` for sequential logic:

```typescript
Effect.gen(function* () {
  const repo = yield* Repository;
  const item = yield* repo.find(id);
  if (Option.isNone(item)) {
    return yield* Effect.fail(new NotFoundError({ id }));
  }
  return item.value;
});
```

## Testing

Use `@effect/vitest`:

```typescript
it.effect("description", () =>
  Effect.gen(function* () {
    const result = yield* operation();
    expect(result).toBe(expected);
  }),
);
```

Mock with `Layer.succeed`:

```typescript
const MockRepo = Layer.succeed(
  Repository,
  Repository.of({
    findById: () => Effect.succeed(mockData),
  }),
);
```

Share layers across tests:

```typescript
layer(TestLayer)("Feature", (it) => {
  it.effect("test 1", () => ...)
  it.effect("test 2", () => ...)
})
```
