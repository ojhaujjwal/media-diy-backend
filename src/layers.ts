import { S3ClientInstanceConfig, S3ServiceLayer } from "@effect-aws/client-s3";
import { Layer } from "effect";
import { MediaContentsRepositoryLive } from "infrastructure/persistence/media-contents.repository.live";
import { MediaMetadataRepositoryLive } from "infrastructure/persistence/media-metadata.repository.live";
import {
  DynamoDBClientInstanceConfig,
  DynamoDBService,
  DynamoDBServiceLayer,
} from "@effect-aws/client-dynamodb";
import { PrettyLogger } from "effect-log";

// DynamoDB Client Configuration
const DynamoDBClientConfigLayer = Layer.succeed(DynamoDBClientInstanceConfig, {
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  ...(process.env.AWS_DYNAMODB_ENDPOINT && {
    endpoint: process.env.AWS_DYNAMODB_ENDPOINT,
  }),
});
const CustomDynamoDBServiceLayer = DynamoDBServiceLayer.pipe(
  Layer.provide(DynamoDBClientConfigLayer),
);

// S3 Client Configuration
const S3ClientConfigLayer = Layer.succeed(S3ClientInstanceConfig, {
  forcePathStyle: true,
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  ...(process.env.AWS_S3_ENDPOINT && { endpoint: process.env.AWS_S3_ENDPOINT }),
});
export const CustomS3ServiceLayer = S3ServiceLayer.pipe(
  Layer.provide(S3ClientConfigLayer),
);

export default Layer.mergeAll(
  ...([
    PrettyLogger.layer({}),
    MediaContentsRepositoryLive,
    MediaMetadataRepositoryLive,
    CustomS3ServiceLayer,
    CustomDynamoDBServiceLayer,
  ] as const),
);
