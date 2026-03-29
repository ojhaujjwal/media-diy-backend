import { Config, Effect, Layer } from "effect";
import { S3ClientInstanceConfig, S3ServiceLayer } from "@effect-aws/client-s3";
import { MediaContentsRepositoryLive } from "./infrastructure/persistence/media-contents.repository.live";
import { MediaMetadataRepositoryLive } from "./infrastructure/persistence/media-metadata.repository.live";
import {
  DynamoDBClientInstanceConfig,
  DynamoDBServiceLayer,
} from "@effect-aws/client-dynamodb";
import { PrettyLogger } from "effect-log";

const loadConfig = () =>
  Effect.runSync(
    Effect.gen(function* () {
      const dynamoDbEndpoint = yield* Config.option(
        Config.string("AWS_DYNAMODB_ENDPOINT"),
      );
      const s3Endpoint = yield* Config.option(Config.string("AWS_S3_ENDPOINT"));

      return {
        region: yield* Config.string("AWS_REGION"),
        accessKeyId: yield* Config.string("AWS_ACCESS_KEY_ID"),
        secretAccessKey: yield* Config.string("AWS_SECRET_ACCESS_KEY"),
        dynamoDbEndpoint:
          dynamoDbEndpoint._tag === "Some" ? dynamoDbEndpoint.value : undefined,
        s3Endpoint: s3Endpoint._tag === "Some" ? s3Endpoint.value : undefined,
      };
    }),
  );

const config = loadConfig();

const DynamoDBClientConfigLayer = Layer.succeed(DynamoDBClientInstanceConfig, {
  region: config.region,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  ...(config.dynamoDbEndpoint && { endpoint: config.dynamoDbEndpoint }),
});

const S3ClientConfigLayer = Layer.succeed(S3ClientInstanceConfig, {
  forcePathStyle: true,
  region: config.region,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  ...(config.s3Endpoint && { endpoint: config.s3Endpoint }),
});

const CustomDynamoDBServiceLayer = DynamoDBServiceLayer.pipe(
  Layer.provide(DynamoDBClientConfigLayer),
);

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
