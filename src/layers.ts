import { Config, Effect, Layer } from "effect";
import { S3Service } from "@effect-aws/client-s3";
import { DynamoDBService } from "@effect-aws/client-dynamodb";
import { MediaContentsRepositoryLive } from "./infrastructure/persistence/media-contents.repository.live.js";
import { MediaMetadataRepositoryLive } from "./infrastructure/persistence/media-metadata.repository.live.js";

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
      const dynamoDbEndpoint = yield* Config.option(Config.string("AWS_DYNAMODB_ENDPOINT"));
      const s3Endpoint = yield* Config.option(Config.string("AWS_S3_ENDPOINT"));

      return {
        region: yield* Config.string("AWS_REGION"),
        accessKeyId: yield* Config.string("AWS_ACCESS_KEY_ID"),
        secretAccessKey: yield* Config.string("AWS_SECRET_ACCESS_KEY"),
        dynamoDbEndpoint: dynamoDbEndpoint._tag === "Some" ? dynamoDbEndpoint.value : undefined,
        s3Endpoint: s3Endpoint._tag === "Some" ? s3Endpoint.value : undefined
      };
    })
  );

const config = loadConfig();

const S3ConfigLayer = S3Service.layer({
  forcePathStyle: true,
  region: config.region,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  },
  ...(config.s3Endpoint && { endpoint: config.s3Endpoint })
});

const DynamoDBConfigLayer = DynamoDBService.layer({
  region: config.region,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  },
  ...(config.dynamoDbEndpoint && { endpoint: config.dynamoDbEndpoint })
});

export const S3Layer = Layer.provide(MediaContentsRepositoryLive, S3ConfigLayer);

export const DynamoDBLayer = Layer.provide(MediaMetadataRepositoryLive, DynamoDBConfigLayer);

export default Layer.mergeAll(S3Layer, DynamoDBLayer);
