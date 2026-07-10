import { RuntimeContext } from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Config, Effect, Layer } from "effect";
import {
  MediaContentsRepository,
  MediaContentsRepositoryError
} from "../../domain/repository/media-contents.repository.js";
import { MediaBucket } from "../../resources/bucket.js";
import { createPresignedUrl } from "./sigv4.js";

export const MediaContentsR2Live = Layer.effect(
  MediaContentsRepository,
  Effect.gen(function* () {
    const ctx = yield* RuntimeContext;
    const bucket = yield* Cloudflare.R2Bucket.bind(MediaBucket);

    const r2AccessKeyId = yield* Config.string("R2_ACCESS_KEY_ID");
    const r2SecretAccessKey = yield* Config.string("R2_SECRET_ACCESS_KEY");
    const r2BucketName = yield* Config.string("R2_BUCKET_NAME");
    const r2AccountId = yield* Config.string("R2_ACCOUNT_ID");
    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com`;

    return MediaContentsRepository.of({
      isFileExist: (fromPath) =>
        bucket.head(fromPath).pipe(
          Effect.map((obj) => obj !== null),
          Effect.mapError(
            (e) =>
              new MediaContentsRepositoryError({
                message: e.message,
                reason: "UnknownError",
                previous: e
              })
          ),
          Effect.provideService(RuntimeContext, ctx)
        ),

      generatePresignedUrlForUpload: (contentType, filePath) =>
        createPresignedUrl({
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          region: "auto",
          endpoint: r2Endpoint,
          bucket: r2BucketName,
          key: filePath,
          contentType,
          expiresIn: 3600
        })
    });
  })
);
