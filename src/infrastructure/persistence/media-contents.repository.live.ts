import { S3Service } from "@effect-aws/client-s3";
import {
  MediaContentsRepository,
  MediaContentsRepositoryError,
} from "domain/repository/media-contents.repository";
import { Effect, Layer } from "effect";
import { randomUUID } from "crypto";
import { LocalDate } from "@js-joda/core";
import { MediaFileExtension } from "domain/model/media";

const bucket = process.env.AWS_BUCKET_NAME as string;

const generateFileName = (fileExtension: MediaFileExtension) => {
  const today = LocalDate.now();
  return `${today.year()}/${today.monthValue()}/${today.dayOfMonth()}/${randomUUID()}.${fileExtension}`;
};

export const MediaContentsRepositoryLive = Layer.succeed(
  MediaContentsRepository,
  MediaContentsRepository.of({
    //TODO: validate file
    isFileExist: (fromPath) =>
      Effect.all([S3Service]).pipe(
        Effect.flatMap(([s3Service]) =>
          s3Service.headObject({
            Bucket: bucket,
            Key: fromPath,
          }),
        ),
        Effect.map(() => true),
        Effect.catchTag("NotFound", () => Effect.succeed(false)),
        Effect.catchAll((e) => {
          return Effect.fail(
            new MediaContentsRepositoryError({
              message: "Something went wrong",
              reason: "UnknownError",
              previous: e,
            }),
          );
        }),
      ),

    generatePresignedUrlForUpload: (contentType, filePath) =>
      Effect.all([S3Service]).pipe(
        Effect.flatMap(([s3Service]) =>
          s3Service.putObject(
            {
              Bucket: bucket,
              Key: filePath,
              ContentType: contentType,
            },
            { presigned: true },
          ),
        ),
        Effect.catchAll((e) => {
          return Effect.fail(
            new MediaContentsRepositoryError({
              message: "Something went wrong",
              reason: "UnknownError",
              previous: e,
            }),
          );
        }),
      ),
  }),
);
