import { Config, Effect, Layer } from "effect";
import { S3Service } from "@effect-aws/client-s3";
import {
  MediaContentsRepository,
  MediaContentsRepositoryError,
} from "../../domain/repository/media-contents.repository";

const bucketName = Effect.runSync(Config.string("AWS_BUCKET_NAME"));

export const MediaContentsRepositoryLive: Layer.Layer<
  MediaContentsRepository,
  never,
  S3Service
> = Layer.effect(
  MediaContentsRepository,
  Effect.gen(function* () {
    const s3Service = yield* S3Service;

    return MediaContentsRepository.of({
      isFileExist: (fromPath) =>
        Effect.gen(function* () {
          yield* s3Service.headObject({
            Bucket: bucketName,
            Key: fromPath,
          });
          return true;
        }).pipe(
          Effect.map(() => true),
          Effect.catchTag("NotFound", () => Effect.succeed(false)),
          Effect.mapError(
            (e) =>
              new MediaContentsRepositoryError({
                message: "Something went wrong",
                reason: "UnknownError",
                previous: e,
              }),
          ),
        ),

      generatePresignedUrlForUpload: (contentType, filePath) =>
        s3Service
          .putObject(
            {
              Bucket: bucketName,
              Key: filePath,
              ContentType: contentType,
            },
            { presigned: true },
          )
          .pipe(
            Effect.mapError(
              (e) =>
                new MediaContentsRepositoryError({
                  message: "Something went wrong",
                  reason: "UnknownError",
                  previous: e,
                }),
            ),
          ),
    });
  }),
);
