# Clear Architecture

Architecture following Clean Architecture / Ports & Adapters pattern with Effect-TS.

## Layer Structure

```
┌────────────────────────────────────────────────────┐
│           Domain Layer (Entities)                  │
│  - MediaMetadata (Aggregate Root)                  │
│  - MediaType, ExifMetadata (Value Objects)         │
│  - Repository Interfaces (Ports)                   │
├────────────────────────────────────────────────────┤
│     Interface Adapters (Repository Live)           │
│  - MediaMetadataRepositoryLive (DynamoDB)          │
│  - MediaContentsRepositoryLive (S3)                │
├────────────────────────────────────────────────────┤
│        Frameworks & Drivers (AWS)                  │
│  - DynamoDB (metadata storage)                     │
│  - S3 (content storage)                            │
└────────────────────────────────────────────────────┘
```

## Domain Layer

### Core Entity

**MediaMetadata** - Aggregate root representing a media item.

| Field              | Type          | Description                 |
| ------------------ | ------------- | --------------------------- |
| `id`               | UUID          | Unique identifier           |
| `ownerUserId`      | UUID          | Owning user                 |
| `filePath`         | string        | S3 storage path             |
| `originalFileName` | string        | Original filename           |
| `md5Hash`          | string        | Content hash                |
| `type`             | MediaType     | PHOTO, VIDEO, or LIVE_PHOTO |
| `deviceId`         | string        | Source device               |
| `uploadedAt`       | Date          | Record creation time        |
| `capturedAt`       | Date          | Original capture time       |
| `exif`             | ExifMetadata? | EXIF data                   |

**Domain Rules**:

- Each media belongs to one user
- Content must exist in S3 before metadata saved
- File extension must match media type

### Value Objects

**MediaType**: Enumeration - `PHOTO`, `VIDEO`, `LIVE_PHOTO`

**File Extensions**:

- PHOTO: heic, heif, jpg, jpeg, png
- VIDEO: mov, mp4
- LIVE_PHOTO: all of the above

**ExifMetadata**: Optional EXIF data (dateTaken, GPS, camera info)

### Repository Interfaces (Ports)

**MediaMetadataRepository**:

- `create`: Persist metadata to storage
- `findById`: Retrieve by user ID + media ID

**MediaContentsRepository**:

- `isFileExist`: Check if content exists in S3
- `generatePresignedUrlForUpload`: Create presigned PUT URL

Both return typed errors via Effect.

## Interface Adapters

Live implementations of repository interfaces.

### MediaMetadataRepositoryLive (DynamoDB)

**Key Design**: Composite key for user-scoped access

- PK: `User-${userId}` (partition key)
- SK: `MediaMetadata-${id}` (sort key)

**Operations**:

- `create`: PutItem with composite key
- `findById`: GetItem by composite key

### MediaContentsRepositoryLive (S3)

**Key Principle**: Client uploads directly to S3 via presigned URLs, reducing server bandwidth.

**Operations**:

- `isFileExist`: HEAD request to check if object exists
- `generatePresignedUrlForUpload`: Create presigned PUT URL for client uploads

## Frameworks & Drivers

### AWS Services

**DynamoDB**: Metadata storage

- Table: `media-metadata`
- Composite key design supports user-scoped queries

**S3**: Content storage

- Bucket: `media-contents`
- Presigned URLs enable direct client uploads

### Local Development

Use LocalStack via docker-compose:

```bash
docker-compose up -d
aws --endpoint-url=http://localhost:4566 s3 mb s3://media-contents
aws --endpoint-url=http://localhost:4566 dynamodb create-table ...
```

### Configuration

**DynamoDB**:

- `DYNAMODB_MEDIA_METADATA_TABLE_NAME`
- `AWS_DYNAMODB_ENDPOINT` (optional)

**S3**:

- `S3_MEDIA_CONTENTS_BUCKET_NAME`
- `AWS_S3_ENDPOINT` (optional)

## Design Principles

### Domain Layer Independence

- **No framework dependencies**: Domain doesn't know about AWS, HTTP, or Effect
- **Repository interfaces**: Define contracts, not implementations
- **Immutability**: Entities are immutable value objects

### Dependency Direction

Dependencies point inward:

```
Infrastructure → Interface Adapters → Domain
```

Domain has zero external dependencies.

### Testing Strategy

- **Unit tests**: Mock repository interfaces (Layer.succeed)
- **Integration tests**: Use LocalStack implementations
- **Never test with real AWS**: Always use local services

### Error Handling

- Domain errors: Typed via Effect error channel
- Infrastructure errors: Mapped to domain errors at adapter layer
- Never leak AWS details to domain

## Best Practices

1. **Domain purity**: Business logic stays in domain, infrastructure in adapters
2. **Interface segregation**: Repository interfaces are minimal and focused
3. **Dependency injection**: Use Effect's Layer system for wiring
4. **Presigned URLs**: Clients upload directly to S3
5. **Key design**: DynamoDB keys support access patterns (user scope)
