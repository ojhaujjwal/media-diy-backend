import * as Http from "@effect/platform/HttpClient";
import { Resolver } from "@effect/rpc";
import { HttpResolver } from "@effect/rpc-http";
import { type ClientRouter } from "../../src/http/app-server-factory";
import { UploadMediaRequest } from "../../src/http/request/upload-media.request";
import { MediaType } from "../../src/domain/model/media";
import { Effect, Either, Layer, Option } from "effect";
import { describe, it, expect, beforeAll } from "@effect/vitest";
import { randomUUID } from "crypto";
import { NodeRuntime } from "@effect/platform-node";
import { NodeHttpServer } from "@effect/platform-node";
import * as HttpServer from "@effect/platform/HttpServer";
import { HttpRouter } from "@effect/rpc-http";
import { Router } from "@effect/rpc";
import { uploadMediaRouteHandler } from "../../src/http/rpc-handler/upload-media.handler";
import { generateUploadPresignedUrlHandler } from "../../src/http/rpc-handler/generate-upload-presigned-url.handler";
import { findMediaByIdHandler } from "../../src/http/rpc-handler/find-media-by-id.handler";
import { MediaContentsRepository } from "../../src/domain/repository/media-contents.repository";
import { MediaMetadataRepositoryLive } from "../../src/infrastructure/persistence/media-metadata.repository.live";
import {
  DynamoDBClientInstanceConfig,
  DynamoDBServiceLayer,
} from "@effect-aws/client-dynamodb";
import { PrettyLogger } from "effect-log";
import { createServer } from "http";

const rpcRouter = Router.make(
  uploadMediaRouteHandler,
  generateUploadPresignedUrlHandler,
  findMediaByIdHandler,
);

const MediaContentsRepositoryMock = Layer.succeed(
  MediaContentsRepository,
  MediaContentsRepository.of({
    isFileExist: () => Effect.succeed(false),
    generatePresignedUrlForUpload: () => Effect.succeed(""),
  }),
);

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

const testLayers = Layer.mergeAll(
  PrettyLogger.layer({}),
  MediaContentsRepositoryMock,
  MediaMetadataRepositoryLive,
  DynamoDBServiceLayer.pipe(Layer.provide(DynamoDBClientConfigLayer)),
);

const rpcClientResolver = HttpResolver.make<ClientRouter>(
  Http.client.fetchOk.pipe(
    Http.client.mapRequest(
      Http.request.prependUrl("http://localhost:9030/rpc"),
    ),
  ),
);

const rpcClient = Resolver.toClient(rpcClientResolver);

describe("UploadMediaRequest", () => {
  beforeAll(() => {
    const httpServerFactory = (serverPort: number) =>
      HttpServer.router.empty.pipe(
        HttpServer.router.post("/rpc", HttpRouter.toHttpApp(rpcRouter)),
        HttpServer.server.serve(HttpServer.middleware.logger),
        HttpServer.server.withLogAddress,
        Layer.provide(
          NodeHttpServer.server.layer(createServer, { port: serverPort }),
        ),
      );

    NodeRuntime.runMain(
      Layer.launch(httpServerFactory(9030)).pipe(Effect.provide(testLayers)),
    );
  });

  it.effect("should return fail if file not found", () =>
    Effect.gen(function* () {
      const failureOrSuccess = yield* rpcClient(
        new UploadMediaRequest({
          md5Hash: "asfsadasdf",
          deviceId: "a1",
          originalFileName: "file1.png",
          type: MediaType.PHOTO,
          filePath: "/a/file2.png",
          capturedAt: new Date(),
          id: randomUUID(),
        }),
      ).pipe(Effect.either);

      expect(Either.isLeft(failureOrSuccess)).toEqual(true);

      const error = Either.getLeft(failureOrSuccess);

      if (!Option.isSome(error)) {
        throw new Error("Error should be present");
      }

      expect(error.value.errorCode).toEqual("media_not_found");
    }),
  );
});
