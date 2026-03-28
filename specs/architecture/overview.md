# Architecture Overview

## Overview

Media DIY Backend is a **media storage and management system** built using a **layered functional architecture** with Effect-TS. It provides APIs for uploading, storing, and retrieving media files (photos, videos) with metadata tracking.

## Architectural Pattern

**Layered Architecture (Ports & Adapters / Hexagonal)** with **Effect-TS Functional Programming**

The architecture follows clean separation of concerns with explicit dependency injection via Effect's Layer system.

```
┌─────────────────────────────────────────┐
│              HTTP Layer                 │
│    (RPC Handlers, Request Schemas)      │
└──────────────┬──────────────────────────┘
               │ uses interfaces
┌──────────────▼──────────────────────────┐
│             Domain Layer                │
│  (Entities, Value Objects, Repository   │
│           Interfaces/Ports)             │
└──────────────┬──────────────────────────┘
               │ implemented by
┌──────────────▼──────────────────────────┐
│         Infrastructure Layer            │
│  (Repository Implementations, External  │
│           Service Clients)              │
└─────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── layers.ts                          # Dependency injection composition root
├── domain/                            # Business logic and domain models
│   ├── model/
│   │   └── media.ts                   # Domain entities and value objects
│   └── repository/
│       ├── media-contents.repository.ts    # Content storage interface
│       └── media-metadata.repository.ts    # Metadata storage interface
├── infrastructure/                    # External service implementations
│   └── persistence/
│       ├── media-contents.repository.live.ts   # S3 implementation
│       └── media-metadata.repository.live.ts   # DynamoDB implementation
└── http/                              # HTTP transport layer
    ├── run-server.ts                  # Application entry point
    ├── app-server-factory.ts          # Server factory and routing
    ├── request/                       # Request/response schemas
    │   ├── upload-media.request.ts
    │   ├── find-media-by-id.request.ts
    │   └── generate-upload-presigned-url.request.ts
    └── rpc-handler/                   # Request handlers
        ├── helpers.ts
        ├── upload-media.handler.ts
        ├── find-media-by-id.handler.ts
        └── generate-upload-presigned-url.handler.ts
```

## Technology Stack

| Component      | Technology            | Purpose                                |
| -------------- | --------------------- | -------------------------------------- |
| Runtime        | Node.js               | Execution environment                  |
| Language       | TypeScript 5.4+       | Type-safe development                  |
| Framework      | Effect-TS 3.1+        | Functional effects, DI, error handling |
| HTTP Server    | @effect/platform-node | HTTP server implementation             |
| RPC            | @effect/rpc           | Type-safe remote procedure calls       |
| Schema         | @effect/schema        | Runtime validation and type inference  |
| Database       | AWS DynamoDB          | Media metadata storage                 |
| Object Storage | AWS S3                | Media file storage                     |
| Date/Time      | @js-joda/core         | Date manipulation                      |
| Testing        | Vitest                | Unit and integration testing           |

## Layer Responsibilities

### HTTP Layer (`src/http/`)

**Responsibility**: Handle HTTP transport, request routing, and input validation.

**Key Patterns**:

- **Single RPC Endpoint**: All requests route through `/rpc` endpoint
- **Tagged Requests**: Each request type extends `S.TaggedRequest` for type-safe routing
- **Automatic Validation**: `@effect/schema` validates requests at the boundary
- **Error Transformation**: Domain errors mapped to HTTP-friendly error schemas

**Request Flow**:

1. Client sends POST to `/rpc` with tagged request payload
2. `Router.make()` dispatches to appropriate handler based on tag
3. Schema validates input against request definition
4. Handler executes business logic
5. Response serialized and returned

### Domain Layer (`src/domain/`)

**Responsibility**: Define business entities, rules, and repository interfaces.

See [domain-model.md](./domain-model.md) for detailed entity documentation.

### Infrastructure Layer (`src/infrastructure/`)

**Responsibility**: Implement repository interfaces using external services.

**MediaMetadataRepositoryLive**:

- **Storage**: AWS DynamoDB
- **Key Pattern**: Composite key design
  - Hash Key: `User-${ownerUserId}`
  - Range Key: `MediaMetadata-${mediaId}`
- **Operations**: PutItem (create), GetItem (find)

**MediaContentsRepositoryLive**:

- **Storage**: AWS S3
- **Operations**: `isFileExist` (HEAD object), `generatePresignedUrlForUpload` (presigned PUT URL)

See [infrastructure-guide.md](../guides/infrastructure-guide.md) for implementation details.

## Dependency Injection

**Composition Root** (`src/layers.ts`):

All dependencies composed into a single `Layer` provided at application startup:

```typescript
Layer.mergeAll(
  PrettyLogger.layer({}),
  MediaContentsRepositoryLive,
  MediaMetadataRepositoryLive,
  CustomS3ServiceLayer,
  CustomDynamoDBServiceLayer,
);
```

**Configuration Layers**:

- AWS service configurations read from environment variables
- Supports local development (LocalStack/Docker) via endpoint overrides
- Credentials injected via layers

## Data Flow

### Upload Media Flow

```
Client → HTTP /rpc (UploadMediaRequest)
              ↓
       Schema Validation
              ↓
    upload-media.handler.ts
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
MediaContents      MediaMetadata
Repository         Repository
    ↓                   ↓
   S3                DynamoDB
    ↓                   ↓
    └─────────┬─────────┘
              ↓
       Response to Client
```

### Get Presigned URL Flow

```
Client → HTTP /rpc (GenerateUploadPresignedUrlRequest)
              ↓
       Schema Validation
              ↓
    generate-upload-presigned-url.handler.ts
              ↓
    MediaContentsRepository
              ↓
              S3 (generate presigned URL)
              ↓
       Return URL to Client
```

### Find Media Flow

```
Client → HTTP /rpc (FindMediaByIdRequest)
              ↓
       Schema Validation
              ↓
    find-media-by-id.handler.ts
              ↓
    MediaMetadataRepository
              ↓
              DynamoDB
              ↓
       Return MediaMetadata to Client
```

## Key Architectural Decisions

1. **Effect-TS over Promise/async-await**:

   - Explicit error handling
   - Composable effects
   - Resource safety
   - Dependency injection

2. **RPC over REST**:

   - Single endpoint reduces HTTP complexity
   - Type-safe client/server contracts
   - Automatic validation and serialization

3. **Repository Pattern**:

   - Abstract storage implementation
   - Easy testing with mocks
   - Swappable implementations

4. **Presigned URLs for Uploads**:

   - Client uploads directly to S3
   - Reduces server load and bandwidth
   - Better scalability

5. **Composite Key in DynamoDB**:
   - Hash key for user partitioning
   - Range key for media identification
   - Supports efficient user-scoped queries

## Environment Configuration

**Required Environment Variables**:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# DynamoDB
DYNAMODB_MEDIA_METADATA_TABLE_NAME=media-metadata
AWS_DYNAMODB_ENDPOINT=http://localhost:8000  # Optional: for local dev

# S3
S3_MEDIA_CONTENTS_BUCKET_NAME=media-contents
AWS_S3_ENDPOINT=http://localhost:9000  # Optional: for local dev
```

## Future Considerations

- **Authentication**: Currently hardcoded; needs JWT/auth context
- **Pagination**: List operations need pagination support
- **Media Processing**: Thumbnail generation, transcoding
- **Search**: Query media by metadata, tags, dates
- **Sharing**: Share media between users
- **Soft Delete**: Mark media as deleted instead of immediate removal
