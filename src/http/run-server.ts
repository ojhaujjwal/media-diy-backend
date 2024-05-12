import { Effect, Layer } from "effect";
import { HttpServer } from "./http-server";
import { NodeRuntime } from "@effect/platform-node";
import { MediaContentsRepositoryLive } from "infrastructure/persistence/media-contents.repository.live";
import { BaseS3ServiceLayer, S3ClientInstance } from "@effect-aws/client-s3";
import { S3Client } from "@aws-sdk/client-s3";


const S3ClientInstanceLayer = Layer.succeed(
  S3ClientInstance,
  new S3Client({
    forcePathStyle: true,
    //region: "ap-southeast-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
    ...(process.env.AWS_S3_ENDPOINT && { endpoint: process.env.AWS_S3_ENDPOINT })
  }),
);

Layer.launch(HttpServer).pipe(
  Effect.provide(MediaContentsRepositoryLive),
  Effect.provide(MediaContentsRepositoryLive),
  Effect.provide(BaseS3ServiceLayer),
  Effect.provide(S3ClientInstanceLayer),
  NodeRuntime.runMain,
)
