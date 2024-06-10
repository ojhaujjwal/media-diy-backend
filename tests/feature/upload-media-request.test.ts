import * as Http from "@effect/platform/HttpClient";
import { Resolver } from "@effect/rpc";
import { HttpResolver } from "@effect/rpc-http";
import {
  appServerFactory,
  type ClientRouter,
} from "../../src/http/app-server-factory";
import { UploadMediaRequest } from "../../src/http/request/upload-media.request";
import { MediaType } from "../../src/domain/model/media";
import { Effect, Either, Option } from "effect";
import { describe, it, expect, beforeAll } from "@effect/vitest";
import { randomUUID } from "crypto";
import { NodeRuntime } from "@effect/platform-node";

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
    NodeRuntime.runMain(
      appServerFactory(9030), //TODO: generate random available port instead
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
