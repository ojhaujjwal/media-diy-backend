import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { appServerFactory } from "../../src/http/app-server-factory";
import { UPLOAD_MEDIA_ERROR_CODE } from "../../src/http/request/upload-media.request";
import { MediaType } from "../../src/domain/model/media";
import { Effect, Either, Layer, pipe } from "effect";
import * as NodeClient from "@effect/platform-node/NodeHttpClient";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { describe, expect, it, beforeAll } from "@effect/vitest";
import { FileSystem } from "@effect/platform";
import { randomUUID } from "crypto";
import { NodeRuntime } from "@effect/platform-node";
import { MediaRpcs } from "../../src/http/rpc-handler/rpc-definitions";

const rpcClientLayer = pipe(
  RpcClient.layerProtocolHttp({
    url: "http://localhost:9020/rpc",
  }),
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson]),
);

describe("UploadMediaRequest", () => {
  beforeAll(() => {
    NodeRuntime.runMain(appServerFactory(9020));
  });

  describe("GenerateUploadPresignedUrlRequest and then UploadMediaRequest", () => {
    it("should generate the URL with valid request and then upload the media and then fail when uploading the same media", () =>
      Effect.gen(function* () {
        const client = yield* RpcClient.make(MediaRpcs);

        yield* client.GenerateUploadPresignedUrlequest({
          mediaType: MediaType.PHOTO,
          fileExtension: "jpeg",
        });

        const { presignedUrl, filePath } =
          yield* client.GenerateUploadPresignedUrlequest({
            mediaType: MediaType.PHOTO,
            fileExtension: "jpeg",
          });
        const httpClient = yield* HttpClient.HttpClient;
        const fs = yield* FileSystem.FileSystem;
        const { size: fileSizeInBytes } = yield* fs.stat(
          "./tests/assets/koala.jpeg",
        );

        const req = HttpClientRequest.put(presignedUrl).pipe(
          HttpClientRequest.bodyStream(fs.stream("./tests/assets/koala.jpeg"), {
            contentLength: Number(fileSizeInBytes),
          }),
        );
        const uploadMediaResponse = yield* httpClient.execute(req);
        expect(uploadMediaResponse.status).toEqual(200);

        const id = randomUUID();

        yield* client.UploadMediaRequest({
          sha256Hash: "asfsadasdf",
          deviceId: "a1",
          originalFileName: "koala.jpeg",
          type: MediaType.PHOTO,
          filePath,
          capturedAt: new Date(),
          id,
        });

        const mediaResponse = yield* client.FindMediaByIdRequest({
          id,
          ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
        });

        expect(mediaResponse.id).toEqual(id);

        const failureOrSuccess = yield* client
          .UploadMediaRequest({
            sha256Hash: "asfsadasdf",
            deviceId: "a1",
            originalFileName: "koala.jpeg",
            type: MediaType.PHOTO,
            filePath,
            capturedAt: new Date(),
            id,
          })
          .pipe(Effect.either);

        if (!Either.isLeft(failureOrSuccess)) {
          throw new Error(
            "Expected uploading the same media should fail, but got success.",
          );
        }

        const error = failureOrSuccess.left;
        if (!("errorCode" in error)) {
          throw new Error(`Expected error with errorCode, got: ${error._tag}`);
        }

        expect(error.errorCode).toEqual(
          UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS,
        );
      }).pipe(
        Effect.scoped,
        Effect.provide(rpcClientLayer),
        Effect.provide(NodeClient.layer),
        Effect.provide(NodeFileSystem.layer),
        Effect.runPromise,
      ));
  });
});
