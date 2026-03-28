# Testing Guide

Testing patterns using Vitest and @effect/vitest.

## Test Types

| Type        | Tool           | Purpose                                    |
| ----------- | -------------- | ------------------------------------------ |
| Unit        | @effect/vitest | Test functions/handlers in isolation       |
| Integration | @effect/vitest | Test with real infrastructure (LocalStack) |

## Test Variants

| Method      | Use Case                                  |
| ----------- | ----------------------------------------- |
| `it.effect` | Most tests - deterministic with TestClock |
| `it.live`   | Real time/IO needed                       |
| `it.scoped` | Resource cleanup required                 |

## Basic Test

```typescript
it.effect("description", () =>
  Effect.gen(function* () {
    const result = yield* operation();
    expect(result).toBe(expected);
  }),
);
```

## Mocking

Mock repositories with `Layer.succeed`:

```typescript
const MockRepo = Layer.succeed(
  Repository,
  Repository.of({
    findById: () => Effect.succeed(mockData),
    create: () => Effect.void,
  }),
);
```

Provide mocks to tests:

```typescript
it.effect("test", () =>
  Effect.gen(function* () {
    // ...
  }).pipe(Effect.provide(MockRepo)),
);
```

## Sharing Layers

```typescript
layer(TestLayer)("Feature", (it) => {
  it.effect("test 1", () => ...)
  it.effect("test 2", () => ...)
})
```

## Testing Errors

Test error cases explicitly:

```typescript
it.effect("fails when not found", () =>
  Effect.gen(function* () {
    const result = yield* operation.pipe(
      Effect.match({
        onFailure: (e) => e,
        onSuccess: () => {
          throw new Error("Should fail");
        },
      }),
    );
    expect(result._tag).toBe("NotFoundError");
  }),
);
```

## Integration Testing

Use LocalStack for integration tests:

```typescript
const IntegrationLayer = Layer.mergeAll(
  RepositoryLive,
  LocalStackS3Layer,
  LocalStackDynamoDBLayer,
);
```

## Best Practices

1. Use `Effect.gen` for async - don't mix with promises
2. Mock at boundaries - repositories, external services
3. Test both success and failure paths
4. Keep tests focused - one behavior per test
5. Use `it.layer` for shared setup
6. Assert on error types, not just messages
7. Test edge cases - empty inputs, boundaries
8. Never hit real AWS - use LocalStack
