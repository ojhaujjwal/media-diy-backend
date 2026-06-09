# Migrate Effect-based API to Cloudflare Workers via Alchemy

## Motivation

- Replace Node.js dependency (`@effect/platform-node`, `NodeHttpServer`, `NodeRuntime`)
- Replace local MinIO + DynamoDB with Cloudflare-native services (R2 + D1)
- Simplify deployment — single `alchemy deploy` instead of docker-compose + manual infra
- Gain hot-reload, type-safe bindings, and ephemeral test stacks via Alchemy

## Key Decisions

| Decision | Rationale |
|---|---|
| Keep hexagonal architecture | Handlers depend on repository interfaces (`Context.Service`), never on D1/R2 directly |
| Keep Effect RPC (`effect/unstable/rpc`) | Works on Workers (zero Node.js deps), preserves typed client/server contract |
| Map infra errors to domain errors | `R2Error` → `MediaContentsRepositoryError`, D1 errors → `MediaMetadataRepositoryError` — handlers never see implementation errors |
| No cold-start Layer build | Bindings provided lazily per-request via `Effect.provide`, not pre-built in init — avoids cold-start performance hit |
| Same Schema validation style | `Schema.Struct` + `schemaBodyJson` for request payloads (matches original pattern) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  alchemy.run.ts  (Stack: IaC + deployment)       │
│                                                    │
│  Cloudflare.R2Bucket("MediaBucket")                │
│  Cloudflare.D1Database("MediaDb", { migrationsDir })│
│  Cloudflare.Worker("MediaWorker")                  │
│    └─ RpcServer.toHttpEffect(MediaRpcs)             │
│         ├─ handlersLayer (MediaRpcLive)              │
│         └─ Layer.provideMerge(                       │
│              MediaContentsR2Live,    ← R2-based      │
│              MediaMetadataD1Live,    ← D1-based      │
│              RpcSerialization.layerJson,             │
│              R2BucketBindingLive,                    │
│              D1ConnectionLive,                       │
│            )                                         │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ domain/model/media.ts          ← unchanged    │  │
│  │ domain/repository/                             │  │
│  │   media-contents.repository.ts  ← unchanged    │  │
│  │   media-metadata.repository.ts  ← unchanged    │  │
│  │ infrastructure/                                │  │
│  │   persistence/                                 │  │
│  │     media-contents.r2.ts       ← NEW (R2)      │  │
│  │     media-metadata.d1.ts       ← NEW (D1)      │  │
│  │ http/rpc-handler/                              │  │
│  │   rpc-definitions.ts  ← adapted (minor v4 API) │  │
│  │   media-rpc-handlers.ts        ← adapted       │  │
│  │   upload-media.handler.ts      ← adapted       │  │
│  │   generate-upload-presigned-url.handler.ts ← adapted│
│  │   find-media-by-id.handler.ts   ← adapted      │  │
│  │   find-media-by-hash.handler.ts ← adapted      │  │
│  │   helpers.ts                   ← unchanged     │  │
│  │ http/request/                   ← adapted      │  │
│  │ http/worker.ts                 ← NEW           │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Migration Steps

### Step 1: Project setup (done)

- Add `alchemy@next`, `@cloudflare/workers-types`
- Remove `@effect/platform-node`, `@effect-aws/*`, `@aws-sdk/*`, `minio`, `nodemon`, `tsx`, `dotenv`

### Step 2: Resource declarations (done)

- `src/resources/bucket.ts` — `Cloudflare.R2Bucket("MediaBucket")`
- `src/resources/db.ts` — `Cloudflare.D1Database("MediaDb", { migrationsDir: "./migrations" })`

### Step 3: D1 schema (done)

`migrations/001_create_media_metadata.sql` — SQLite table with indexes on sha256_hash and owner_user_id.

### Step 4: Repository implementations

`src/infrastructure/persistence/media-contents.r2.ts` — implements `MediaContentsRepository`:
- `isFileExist`: `R2Bucket.head(key)` → `Effect<boolean, MediaContentsRepositoryError>`
- `generatePresignedUrlForUpload`: `R2Bucket.put(key, null, { /* presign */ })` → `Effect<string, MediaContentsRepositoryError>`
- Errors mapped: `R2Error` → `MediaContentsRepositoryError`
- Exports `Layer` requiring `R2BucketBinding`

`src/infrastructure/persistence/media-metadata.d1.ts` — implements `MediaMetadataRepository`:
- `create`: `D1Connection.prepare(INSERT).bind(...).run()`
- `findById`: `D1Connection.prepare(SELECT WHERE).bind(...).first()` → `Schema.decode` → `MediaMetadata`
- `findByHash`: `D1Connection.prepare(SELECT WHERE sha256_hash).bind(...).first()` → ...
- Errors mapped: D1 errors → `MediaMetadataRepositoryError`
- Exports `Layer` requiring `D1Connection`

### Step 5: RPC layer (adapted, not rewritten)

RPC definitions, request schemas, and handlers keep the same structure.
Only minor Schema v4 API adjustments in `rpc-definitions.ts` and `request/*.ts`.

Handlers depend on repository interfaces (`MediaMetadataRepository`, `MediaContentsRepository`) — never on D1/R2 bindings directly.

### Step 6: Worker entry point

`src/http/worker.ts` — uses `Cloudflare.Worker` to wrap the RPC server.
`RpcServer.toHttpEffect(MediaRpcs)` produces a per-request Effect.
Bindings provided per-request via `Effect.provide` (no cold-start Layer build).

### Step 7: Stack

`alchemy.run.ts` — yields resources and Worker.

### Step 8: Testing

Use `alchemy/Test/Bun` for integration tests with ephemeral stacks.

## Error mapping contract

| Source error | Domain error | `_tag` | Where mapped |
|---|---|---|---|
| `R2Error` | `MediaContentsRepositoryError` | `"MediaContentsRepositoryError"` | `media-contents.r2.ts` |
| D1 errors | `MediaMetadataRepositoryError` | `"MediaMetadataRepositoryError"` | `media-metadata.d1.ts` |

Handlers only `catchTag("MediaContentsRepositoryError")` / `catchTag("MediaMetadataRepositoryError")`.

## Layer composition (per-request, no cold-start build)

```
R2BucketBindingLive ← provided in Worker init
  └─ media-contents.r2.ts depends on R2BucketBinding
       └─ MediaContentsR2Live

D1ConnectionLive ← provided in Worker init
  └─ media-metadata.d1.ts depends on D1Connection
       └─ MediaMetadataD1Live
```

## Files to Create

| File | Purpose |
|---|---|
| `src/infrastructure/persistence/media-contents.r2.ts` | R2-backed contents repository |
| `src/infrastructure/persistence/media-metadata.d1.ts` | D1-backed metadata repository |
| `src/http/worker.ts` | RPC Worker entry point |

## Files to Adapt

| File | Change |
|---|---|
| `src/http/rpc-handler/rpc-definitions.ts` | Schema v4 API adjustments (`Schema.Literals`, `.check(Schema.isUUID())`) |
| `src/http/request/*.ts` | Schema v4 API adjustments |
| `src/http/rpc-handler/*.handler.ts` | Remove `import { randomUUID } from "crypto"` → use `crypto.randomUUID()`; ensure imports from interfaces only |
| `alchemy.run.ts` | Wire Worker into Stack |

## Files Already Removed

| File | Reason |
|---|---|
| `src/http/run-server.ts` | Node.js entry |
| `src/http/app-server-factory.ts` | NodeHttpServer |
| `src/layers.ts` | Node-specific config + layer composition |
| `src/infrastructure/persistence/media-contents.repository.live.ts` | S3/MinIO |
| `src/infrastructure/persistence/media-metadata.repository.live.ts` | DynamoDB |

## Key Differences from Current Architecture

| Aspect | Before | After |
|---|---|---|
| Server | Node HTTP | Cloudflare Workers |
| Object storage | `@effect-aws/client-s3` → MinIO | `R2Bucket` binding |
| Metadata store | `@effect-aws/client-dynamodb` → DynamoDB | `D1Connection` binding |
| HTTP framework | `effect/unstable/rpc` + `NodeHttpServer` | `effect/unstable/rpc` + `RpcServer.toHttpEffect` (same RPC, different transport) |
| Repository impls | S3 + DynamoDB wrappers | R2 + D1 wrappers (same interfaces) |
| Error mapping | S3 errors → domain error | R2/D1 errors → same domain errors |
| Deployment | docker-compose | `alchemy deploy` |
| Local dev | `nodemon` + `tsx` | `alchemy dev` |
| Config | `.env` | Cloudflare vars/secrets |
