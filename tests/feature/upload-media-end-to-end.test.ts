import * as Http from "@effect/platform/HttpClient"
import { Resolver } from "@effect/rpc"
import { HttpResolver } from "@effect/rpc-http"
import type { ClientRouter } from "../../src/http/http-server"
import { UploadMediaRequest } from "../../src/http/request/upload-media.request";
import { MediaType } from "../../src/domain/model/media"
import { Effect } from "effect";
import { GenerateUploadPresignedUrlequest } from "../../src/http/request/generate-upload-presigned-url.request";
import { pipe } from "effect"
import * as NodeClient from "@effect/platform-node/NodeHttpClient"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { describe, expect, it } from "@effect/vitest"
import { FileSystem } from "@effect/platform"
import { stream } from "@effect/platform/Http/Body"
import { Request } from "@effect/rpc/Rpc";
import { RequestResolver } from "effect/RequestResolver";
import { randomUUID } from "crypto";

const rpcClientResolver  = HttpResolver.make<ClientRouter>(
  Http.client.fetchOk.pipe(
    Http.client.mapRequest(Http.request.prependUrl("http://localhost:3000/rpc"))
  )
)

const rpcClient = Resolver.toClient(rpcClientResolver as RequestResolver<Request<any>, never>);

describe('UploadMediaRequest', () => {
  describe('GenerateUploadPresignedUrlRequest and then UploadMediaRequest', () => {
    it("should generate the URL with valid request and then upload the media", () =>
      Effect.gen(function* () {

        const a = rpcClient(new GenerateUploadPresignedUrlequest({
          mediaType: MediaType.PHOTO,
          fileExtension: 'jpeg',
        }))

        const { presignedUrl, filePath } = yield* rpcClient(new GenerateUploadPresignedUrlequest({
          mediaType: MediaType.PHOTO,
          fileExtension: 'jpeg',
        }));
        const client = yield* Http.client.Client
        const fs = yield* FileSystem.FileSystem
        const { size: fileSizeInBytes } = yield* fs.stat('./tests/assets/koala.jpeg');

        const response = yield* pipe(
          Http.request.put(
            presignedUrl,
            { body: stream(fs.stream('./tests/assets/koala.jpeg')), headers: { 'Content-Length': fileSizeInBytes.toString() } }
          ),
          client,
          Effect.scoped,
        )
        expect(response.status).toEqual(200);

        yield* rpcClient(new UploadMediaRequest({
          md5Hash: 'asfsadasdf',
          deviceId: 'a1',
          originalFileName: 'koala.jpeg',
          type: MediaType.PHOTO,
          filePath: filePath,
          capturedAt: new Date(),
          id: randomUUID(),
        }))
      }).pipe(Effect.provide(NodeClient.layer), Effect.provide(NodeFileSystem.layer), Effect.runPromise)
    );
  });
});
