import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { RuntimeContext } from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect, Layer } from "effect";
import {
  MediaContentsRepository,
  MediaContentsRepositoryError
} from "../../domain/repository/media-contents.repository.js";
import { MediaBucket } from "../../resources/bucket.js";

const r2AccountId = process.env.R2_ACCOUNT_ID ?? "";
const r2BucketName = process.env.R2_BUCKET_NAME ?? "";
const r2Endpoint = r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : "";

const s3Client = new S3Client({
  region: "auto",
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? ""
  },
  forcePathStyle: true
});

export const MediaContentsR2Live = Layer.effect(
  MediaContentsRepository,
  Effect.gen(function* () {
    const ctx = yield* RuntimeContext;
    const bucket = yield* Cloudflare.R2Bucket.bind(MediaBucket);

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
        Effect.tryPromise(() =>
          getSignedUrl(
            s3Client,
            new PutObjectCommand({
              Bucket: r2BucketName,
              Key: filePath,
              ContentType: contentType
            }),
            { expiresIn: 3600 }
          )
        ).pipe(
          Effect.mapError(
            (e) =>
              new MediaContentsRepositoryError({
                message: e instanceof Error ? e.message : "Failed to generate presigned URL",
                reason: "UnknownError",
                previous: e instanceof Error ? e : undefined
              })
          )
        )
    });
  })
);
