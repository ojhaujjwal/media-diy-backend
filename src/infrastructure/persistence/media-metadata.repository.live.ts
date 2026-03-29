import { Config, Effect, Layer } from "effect";
import {
  MediaMetadataRepository,
  MediaMetadataRepositoryError,
} from "../../domain/repository/media-metadata.repository";
import { MediaMetadata, MediaType } from "../../domain/model/media";
import { DynamoDBService } from "@effect-aws/client-dynamodb";

const tableName = Effect.runSync(Config.string("AWS_DYNAMODB_TABLE"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AttributeValue = { S: string } | { N: string } | any;

const getDynamoString = (attr: AttributeValue): Effect.Effect<string> => {
  if (
    attr &&
    typeof attr === "object" &&
    "S" in attr &&
    typeof attr.S === "string"
  ) {
    return Effect.succeed(attr.S);
  }
  return Effect.die("Expected DynamoDB string attribute");
};

const MEDIA_TYPE_VALUES: readonly string[] = Object.values(MediaType);

const isValidMediaType = (value: string): value is MediaType => {
  return MEDIA_TYPE_VALUES.includes(value);
};

const parseMediaType = (value: string): Effect.Effect<MediaType> => {
  if (isValidMediaType(value)) {
    return Effect.succeed(value);
  }
  return Effect.die(`Invalid MediaType: ${value}`);
};

export const MediaMetadataRepositoryLive: Layer.Layer<
  MediaMetadataRepository,
  never,
  DynamoDBService
> = Layer.effect(
  MediaMetadataRepository,
  Effect.gen(function* () {
    const dynamoDBService = yield* DynamoDBService;

    return MediaMetadataRepository.of({
      create: (mediaMetadata: MediaMetadata) =>
        dynamoDBService
          .putItem({
            TableName: tableName,
            Item: {
              HashKey: { S: `User-${mediaMetadata.ownerUserId}` },
              RangeKey: { S: `MediaMetadata-${mediaMetadata.id}` },
              GSI1PK: { S: `Hash-${mediaMetadata.sha256Hash}` },

              originalFileName: { S: mediaMetadata.originalFileName },
              deviceId: { S: mediaMetadata.deviceId },
              filePath: { S: mediaMetadata.filePath },
              sha256Hash: { S: mediaMetadata.sha256Hash },
              type: { S: mediaMetadata.type },
              capturedAt: { S: mediaMetadata.capturedAt.toISOString() },
              uploadedAt: { S: mediaMetadata.uploadedAt.toISOString() },
            },
          })
          .pipe(
            Effect.flatMap(() => Effect.void),
            Effect.catchAll((e) =>
              Effect.fail(
                new MediaMetadataRepositoryError({
                  message: "Something went wrong",
                  reason: "UnknownError",
                  previous: e,
                }),
              ),
            ),
          ),

      findById: (ownerUserId, mediaId) =>
        Effect.gen(function* () {
          const item = yield* dynamoDBService.getItem({
            TableName: tableName,
            Key: {
              HashKey: { S: `User-${ownerUserId}` },
              RangeKey: { S: `MediaMetadata-${mediaId}` },
            },
          });

          if (!item.Item) {
            return yield* new MediaMetadataRepositoryError({
              message: "Record not found",
              reason: "RecordNotFound",
            });
          }

          const itemData = item.Item;

          const originalFileName = yield* getDynamoString(
            itemData.originalFileName,
          );
          const capturedAt = yield* getDynamoString(itemData.capturedAt);
          const deviceId = yield* getDynamoString(itemData.deviceId);
          const filePath = yield* getDynamoString(itemData.filePath);
          const sha256Hash = yield* getDynamoString(itemData.sha256Hash);
          const type = yield* getDynamoString(itemData.type);
          const uploadedAt = yield* getDynamoString(itemData.uploadedAt);

          const parsedType = yield* parseMediaType(type);

          return new MediaMetadata({
            id: mediaId,
            originalFileName,
            capturedAt: new Date(capturedAt),
            deviceId,
            filePath,
            sha256Hash,
            ownerUserId,
            type: parsedType,
            uploadedAt: new Date(uploadedAt),
          });
        }).pipe(
          Effect.catchAll((e) =>
            Effect.fail(
              e._tag === "MediaMetadataRepositoryError"
                ? e
                : new MediaMetadataRepositoryError({
                    message: "Something went wrong",
                    reason: "UnknownError",
                    previous: e,
                  }),
            ),
          ),
        ),

      findByHash: (sha256Hash) =>
        Effect.gen(function* () {
          const item = yield* dynamoDBService.query({
            TableName: tableName,
            IndexName: "Sha256HashIndex",
            KeyConditionExpression: "GSI1PK = :gsi1pk",
            ExpressionAttributeValues: {
              ":gsi1pk": { S: `Hash-${sha256Hash}` },
            },
          });

          if (!item.Items || item.Items.length === 0) {
            return yield* new MediaMetadataRepositoryError({
              message: "Record not found",
              reason: "RecordNotFound",
            });
          }

          const itemData = item.Items[0];

          const hashKey = yield* getDynamoString(itemData.HashKey);
          const rangeKey = yield* getDynamoString(itemData.RangeKey);
          const ownerUserId = hashKey.replace("User-", "");
          const mediaId = rangeKey.replace("MediaMetadata-", "");

          const originalFileName = yield* getDynamoString(
            itemData.originalFileName,
          );
          const capturedAt = yield* getDynamoString(itemData.capturedAt);
          const deviceId = yield* getDynamoString(itemData.deviceId);
          const filePath = yield* getDynamoString(itemData.filePath);
          const type = yield* getDynamoString(itemData.type);
          const uploadedAt = yield* getDynamoString(itemData.uploadedAt);

          const parsedType = yield* parseMediaType(type);

          return new MediaMetadata({
            id: mediaId,
            originalFileName,
            capturedAt: new Date(capturedAt),
            deviceId,
            filePath,
            sha256Hash,
            ownerUserId,
            type: parsedType,
            uploadedAt: new Date(uploadedAt),
          });
        }).pipe(
          Effect.catchAll((e) =>
            Effect.fail(
              e._tag === "MediaMetadataRepositoryError"
                ? e
                : new MediaMetadataRepositoryError({
                    message: "Something went wrong",
                    reason: "UnknownError",
                    previous: e,
                  }),
            ),
          ),
        ),
    });
  }),
);
