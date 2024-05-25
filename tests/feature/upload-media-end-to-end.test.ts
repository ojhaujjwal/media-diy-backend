import * as Http from "@effect/platform/HttpClient"
import { Resolver } from "@effect/rpc"
import { HttpResolver } from "@effect/rpc-http"
import type { ClientRouter } from "../../src/http/http-server"
import { UPLOAD_MEDIA_ERROR_CODE, UploadMediaRequest } from "../../src/http/request/upload-media.request";
import { MediaType } from "../../src/domain/model/media"
import { Effect, Either } from "effect";
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
import { FindMediaByIdRequest } from "../../src/http/request/find-media-by-id.request";

const rpcClientResolver  = HttpResolver.make<ClientRouter>(
  Http.client.fetchOk.pipe(
    Http.client.mapRequest(Http.request.prependUrl("http://localhost:3000/rpc"))
  )
)

const rpcClient = Resolver.toClient(rpcClientResolver as RequestResolver<Request<any>, never>);

describe('UploadMediaRequest', () => {
  describe('GenerateUploadPresignedUrlRequest and then UploadMediaRequest', () => {
    it("should generate the URL with valid request and then upload the media and then fail when uploading the same media", () =>
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

        const uploadMediaResponse = yield* pipe(
          Http.request.put(
            presignedUrl,
            { body: stream(fs.stream('./tests/assets/koala.jpeg')), headers: { 'Content-Length': fileSizeInBytes.toString() } }
          ),
          client,
          Effect.scoped,
        )
        expect(uploadMediaResponse.status).toEqual(200);

        const id = randomUUID();

        yield* rpcClient(new UploadMediaRequest({
          md5Hash: 'asfsadasdf',
          deviceId: 'a1',
          originalFileName: 'koala.jpeg',
          type: MediaType.PHOTO,
          filePath: filePath,
          capturedAt: new Date(),
          id,
        }))

        const mediaResponse = yield* rpcClient(new FindMediaByIdRequest({
          id,
          ownerUserId: 'a208ada0-8862-4ede-b45d-8ec34742bbbd',
        }));

        expect(mediaResponse.id).toEqual(id);

        const failureOrSuccess = yield* (rpcClient(new UploadMediaRequest({
          md5Hash: 'asfsadasdf',
          deviceId: 'a1',
          originalFileName: 'koala.jpeg',
          type: MediaType.PHOTO,
          filePath: filePath,
          capturedAt: new Date(),
          id,
        })).pipe(Effect.either));
        if (!Either.isLeft(failureOrSuccess)) {
          throw new Error('Expected uploading the same media should fail, but got success.');
        }

        expect(failureOrSuccess.left.errorCode).toEqual(UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS);
      }).pipe(
        Effect.provide(NodeClient.layer),
        Effect.provide(NodeFileSystem.layer),
        Effect.runPromise
      )
    );
  });
});
