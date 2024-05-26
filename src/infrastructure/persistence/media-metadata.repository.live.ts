

import { Effect, Layer } from "effect";
import { MediaMetadataRepository, MediaMetadataRepositoryError } from "domain/repository/media-metadata.repository";
import { MediaMetadata, MediaType } from "domain/model/media";
import { DynamoDBService } from "@effect-aws/client-dynamodb";

const tableName = process.env.AWS_DYNAMODB_TABLE as string;

export const MediaMetadataRepositoryLive = Layer.succeed(
  MediaMetadataRepository,
  MediaMetadataRepository.of({
    create: (mediaMetadata: MediaMetadata) => Effect.all([DynamoDBService]).pipe(
      Effect.flatMap(
        ([dynamoDBService]) => {
          return dynamoDBService.putItem({
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
  
              //todo: add exif
            }
          });
        }
      ),
      Effect.flatMap(() => Effect.void),
      Effect.catchAll((e) => {
        return Effect.fail(new MediaMetadataRepositoryError({ message: 'Something went wrong', reason: "UnknownError", previous: e }));
      }),
    ),

    findById: (ownerUserId, mediaId) => Effect.all([DynamoDBService]).pipe(
      Effect.flatMap(
        ([dynamoDBService]) => dynamoDBService.getItem({
          TableName: tableName,
          Key: {
            HashKey: { S: `User-${ownerUserId}` },
            RangeKey: { S: `MediaMetadata-${mediaId}` },
          }
        })
      ),
      Effect.flatMap((item) => {
        if (item.Item) {
          return Effect.succeed(new MediaMetadata({
            id: mediaId,
            originalFileName: item.Item.originalFileName.S as string,
            capturedAt: new Date(item.Item.capturedAt.S as string),
            deviceId: item.Item.deviceId.S as string,
            filePath: item.Item.filePath.S as string,

            md5Hash: item.Item.md5Hash.S as string,
            ownerUserId,
            type: item.Item.type.S as MediaType,
            uploadedAt: new Date(item.Item.uploadedAt.S as string),
            
            //todo: add exif
          }));
        } else {
          return Effect.fail(new MediaMetadataRepositoryError({ message: 'Record not found', reason: "RecordNotFound" }));
        }
      }),
      Effect.catchAll((e) => {
        return Effect.fail(new MediaMetadataRepositoryError({ message: 'Something went wrong', reason: "UnknownError", previous: e }));
      }),
    ),
  })
);
