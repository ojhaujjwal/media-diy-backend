import { RpcClient, RpcSerialization } from "@effect/rpc";
import { FetchHttpClient } from "@effect/platform";
import { appServerFactory } from "../../src/http/app-server-factory";
import { MediaType } from "../../src/domain/model/media";
import { Effect, Either, Layer, pipe } from "effect";
import { describe, it, expect, beforeAll } from "@effect/vitest";
import { randomUUID } from "crypto";
import { NodeRuntime } from "@effect/platform-node";
import { MediaRpcs } from "../../src/http/rpc-handler/rpc-definitions";

const rpcClientLayer = pipe(
  RpcClient.layerProtocolHttp({
    url: "http://localhost:9030/rpc",
  }),
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson]),
);

describe("UploadMediaRequest", () => {
  beforeAll(() => {
    NodeRuntime.runMain(appServerFactory(9030));
  });

  it.effect("should return fail if file not found", () =>
    Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);

      const failureOrSuccess = yield* client
        .UploadMediaRequest({
          md5Hash: "asfsadasdf",
          deviceId: "a1",
          originalFileName: "file1.png",
          type: MediaType.PHOTO,
          filePath: "/a/file2.png",
          capturedAt: new Date(),
          id: randomUUID(),
        })
        .pipe(Effect.either);

      expect(Either.isLeft(failureOrSuccess)).toEqual(true);

      const error = Either.getLeft(failureOrSuccess);

      if (error._tag === "None") {
        throw new Error("Error should be present");
      }

      const err = error.value;
      if (!("errorCode" in err)) {
        throw new Error(`Expected error with errorCode, got: ${err._tag}`);
      }

      expect(err.errorCode).toEqual("media_not_found");
    }).pipe(Effect.scoped, Effect.provide(rpcClientLayer)),
  );
});
