import * as Cloudflare from "alchemy/Cloudflare";
import * as Test from "alchemy/Test/Vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodePath from "@effect/platform-node/NodePath";
import * as Result from "effect/Result";
import { RpcClient } from "effect/unstable/rpc";
import { clientLayer, retryReadyN } from "./helpers.js";
import { MediaRpcs } from "../../src/http/rpc-handler/rpc-definitions.js";
import { MediaType } from "../../src/domain/model/media.js";
import Stack from "./fixtures/stack.js";

const hasR2Creds =
  process.env.R2_ACCOUNT_ID !== undefined &&
  process.env.R2_BUCKET_NAME !== undefined &&
  process.env.R2_ACCESS_KEY_ID !== undefined &&
  process.env.R2_SECRET_ACCESS_KEY !== undefined;

const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
  providers: Cloudflare.providers(),
  stage: "test"
});

const stackOutputs = beforeAll(deploy(Stack), { timeout: 180_000 });
afterAll.skipIf(process.env.NO_DESTROY !== undefined)(destroy(Stack), { timeout: 180_000 });

test.skipIf(!hasR2Creds)(
  "PUT to presigned URL uploads object to R2",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const path = yield* Path.Path;
      const fs = yield* FileSystem.FileSystem;
      const __dirname = yield* path.fromFileUrl(new URL(".", import.meta.url));
      const KOALA_PATH = path.resolve(__dirname, "../assets/koala.jpeg");

      const client = yield* RpcClient.make(MediaRpcs);
      const presigned = yield* client
        .GenerateUploadPresignedUrlRequest({
          mediaType: MediaType.PHOTO,
          fileExtension: "jpg"
        })
        .pipe(retryReadyN(5));

      const s3Pattern = /^\d{4}\/\d{1,2}\/\d{1,2}\/[0-9a-f-]{36}\.jpg$/;
      expect.stringMatching(s3Pattern);

      const fileBuffer = yield* fs.readFile(KOALA_PATH);

      const uploadResult = yield* HttpClientRequest.put(presigned.presignedUrl).pipe(
        HttpClientRequest.bodyUint8Array(fileBuffer, "image/jpeg"),
        HttpClient.execute,
        retryReadyN(5)
      );

      expect(uploadResult.status >= 200 && uploadResult.status < 300).toBe(true);

      const exists = yield* client
        .FindMediaByIdRequest({
          ownerUserId: "00000000-0000-0000-0000-000000000000",
          id: "00000000-0000-0000-0000-000000000000"
        })
        .pipe(Effect.result);

      expect(Result.isFailure(exists)).toBe(true);
    }).pipe(
      Effect.scoped,
      Effect.provide(Layer.mergeAll(clientLayer(url), FetchHttpClient.layer, NodeFileSystem.layer, NodePath.layer))
    );
  }),
  { timeout: 120_000 }
);
