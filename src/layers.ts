import { Config, Effect, Layer } from "effect";
import { S3 } from "@effect-aws/client-s3";
import { DynamoDB } from "@effect-aws/client-dynamodb";
import { MediaContentsRepositoryLive } from "./infrastructure/persistence/media-contents.repository.live";
import { MediaMetadataRepositoryLive } from "./infrastructure/persistence/media-metadata.repository.live";
import { PrettyLogger } from "effect-log";

interface Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  dynamoDbEndpoint: string | undefined;
  s3Endpoint: string | undefined;
}

const loadConfig = (): Config =>
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

const S3ConfigLayer = S3.layer({
  forcePathStyle: true,
  region: config.region,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  ...(config.s3Endpoint && { endpoint: config.s3Endpoint }),
});

const DynamoDBConfigLayer = DynamoDB.layer({
  region: config.region,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  ...(config.dynamoDbEndpoint && { endpoint: config.dynamoDbEndpoint }),
});

export const S3Layer = Layer.provide(
  MediaContentsRepositoryLive,
  S3ConfigLayer,
);

export const DynamoDBLayer = Layer.provide(
  MediaMetadataRepositoryLive,
  DynamoDBConfigLayer,
);

export default Layer.mergeAll(
  ...([PrettyLogger.layer({}), S3Layer, DynamoDBLayer] as const),
);
