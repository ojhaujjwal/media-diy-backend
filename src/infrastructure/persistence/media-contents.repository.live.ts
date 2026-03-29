import { Config, Effect, Layer } from "effect";
import { S3Service } from "@effect-aws/client-s3";
import {
  MediaContentsRepository,
  MediaContentsRepositoryError,
} from "../../domain/repository/media-contents.repository";

const bucketName = Effect.runSync(Config.string("AWS_BUCKET_NAME"));

export const MediaContentsRepositoryLive = Layer.succeed(
  MediaContentsRepository,
  MediaContentsRepository.of({
    isFileExist: (fromPath) =>
      S3Service.pipe(
        Effect.flatMap((s3Service) =>
          s3Service.headObject({
            Bucket: bucketName,
            Key: fromPath,
          }),
        ),
        Effect.map(() => true),
        Effect.catchTag("NotFound", () => Effect.succeed(false)),
        Effect.catchAll((e) =>
          Effect.fail(
            new MediaContentsRepositoryError({
              message: "Something went wrong",
              reason: "UnknownError",
              previous: e,
            }),
          ),
        ),
      ),

    generatePresignedUrlForUpload: (contentType, filePath) =>
      S3Service.pipe(
        Effect.flatMap((s3Service) =>
          s3Service.putObject(
            {
              Bucket: bucketName,
              Key: filePath,
              ContentType: contentType,
            },
            { presigned: true },
          ),
        ),
        Effect.catchAll((e) =>
          Effect.fail(
            new MediaContentsRepositoryError({
              message: "Something went wrong",
              reason: "UnknownError",
              previous: e,
            }),
          ),
        ),
      ),
  }),
);
