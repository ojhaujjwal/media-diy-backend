import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { FetchHttpClient } from "effect/unstable/http";
import { appServerFactory } from "../../src/http/app-server-factory.js";
import { MediaType } from "../../src/domain/model/media.js";
import { UPLOAD_MEDIA_ERROR_CODE } from "../../src/http/request/upload-media.request.js";
import { Effect, Layer, pipe, Result } from "effect";
import { describe, it, expect, beforeAll } from "@effect/vitest";
import { randomUUID } from "crypto";
import { NodeRuntime } from "@effect/platform-node";
import { MediaRpcs } from "../../src/http/rpc-handler/rpc-definitions.js";

const rpcClientLayer = pipe(
  RpcClient.layerProtocolHttp({
    url: "http://localhost:9030/rpc"
  }),
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson])
);

describe("UploadMediaRequest", () => {
  beforeAll(() => {
    NodeRuntime.runMain(appServerFactory(9030).pipe(Layer.launch));
  });

  it.effect("should return fail if media already exists", () =>
    Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const id = randomUUID();

      yield* client.UploadMediaRequest({
        sha256Hash: "asfsadasdf",
        deviceId: "a1",
        originalFileName: "file1.png",
        type: MediaType.PHOTO,
        filePath: "/s3/path/file1.png",
        capturedAt: new Date(),
        id
      });

      const failureOrSuccess = yield* client
        .UploadMediaRequest({
          sha256Hash: "asfsadasdf",
          deviceId: "a1",
          originalFileName: "file1.png",
          type: MediaType.PHOTO,
          filePath: "/s3/path/file1.png",
          capturedAt: new Date(),
          id
        })
        .pipe(Effect.result);

      expect(Result.isFailure(failureOrSuccess)).toEqual(true);

      const error = Result.getFailure(failureOrSuccess);

      if (error._tag === "None") {
        throw new Error("Error should be present");
      }

      const err = error.value;
      if (!("errorCode" in err)) {
        throw new Error(`Expected error with errorCode, got: ${err._tag}`);
      }

      expect(err.errorCode).toEqual(UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS);
    }).pipe(Effect.scoped, Effect.provide(rpcClientLayer))
  );
});
