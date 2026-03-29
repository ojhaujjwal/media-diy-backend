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

export const MediaMetadataRepositoryLive = Layer.succeed(
  MediaMetadataRepository,
  MediaMetadataRepository.of({
    create: (mediaMetadata: MediaMetadata) =>
      DynamoDBService.pipe(
        Effect.flatMap((dynamoDBService) =>
          dynamoDBService.putItem({
            TableName: tableName,
            Item: {
              HashKey: { S: `User-${mediaMetadata.ownerUserId}` },
              RangeKey: { S: `MediaMetadata-${mediaMetadata.id}` },

              originalFileName: { S: mediaMetadata.originalFileName },
              deviceId: { S: mediaMetadata.deviceId },
              filePath: { S: mediaMetadata.filePath },
              md5Hash: { S: mediaMetadata.md5Hash },
              type: { S: mediaMetadata.type },
              capturedAt: { S: mediaMetadata.capturedAt.toISOString() },
              uploadedAt: { S: mediaMetadata.uploadedAt.toISOString() },
            },
          }),
        ),
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
      DynamoDBService.pipe(
        Effect.flatMap((dynamoDBService) =>
          dynamoDBService.getItem({
            TableName: tableName,
            Key: {
              HashKey: { S: `User-${ownerUserId}` },
              RangeKey: { S: `MediaMetadata-${mediaId}` },
            },
          }),
        ),
        Effect.flatMap((item) => {
          if (!item.Item) {
            return Effect.fail(
              new MediaMetadataRepositoryError({
                message: "Record not found",
                reason: "RecordNotFound",
              }),
            );
          }

          const itemData = item.Item;

          return Effect.gen(function* () {
            const originalFileName = yield* getDynamoString(
              itemData.originalFileName,
            );
            const capturedAt = yield* getDynamoString(itemData.capturedAt);
            const deviceId = yield* getDynamoString(itemData.deviceId);
            const filePath = yield* getDynamoString(itemData.filePath);
            const md5Hash = yield* getDynamoString(itemData.md5Hash);
            const type = yield* getDynamoString(itemData.type);
            const uploadedAt = yield* getDynamoString(itemData.uploadedAt);

            const parsedType = yield* parseMediaType(type);

            return new MediaMetadata({
              id: mediaId,
              originalFileName,
              capturedAt: new Date(capturedAt),
              deviceId,
              filePath,
              md5Hash,
              ownerUserId,
              type: parsedType,
              uploadedAt: new Date(uploadedAt),
            });
          });
        }),
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
  }),
);
