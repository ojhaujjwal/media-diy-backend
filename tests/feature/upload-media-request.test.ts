import * as Http from "@effect/platform/HttpClient"
import { Resolver } from "@effect/rpc"
import { HttpResolver } from "@effect/rpc-http"
import type { ClientRouter } from "../../src/http/http-server"
import { UploadMediaRequest } from "../../src/http/controller/upload-media.action"
import { MediaType } from "../../src/domain/model/media"
import { Effect, Either, Option, identity } from "effect"
import { describe, it, expect } from 'vitest';


// Create the client
const client = HttpResolver.make<ClientRouter>(
  Http.client.fetchOk.pipe(
    Http.client.mapRequest(Http.request.prependUrl("http://localhost:3000/rpc"))
  )
).pipe(Resolver.toClient)

describe('UploadMediaRequest', () => {
  it('should upload the media with valid request', async () => {
    await Effect.runPromise(Effect.gen(function* () {
      const failureOrSuccess = yield* client(new UploadMediaRequest({
        md5Hash: 'asfsadasdf',
        deviceId: 'a1',
        originalFileName: 'file1.png',
        type: MediaType.PHOTO,
        filePath: '/a/file1.png',
        capturedAt: new Date(),
      })).pipe(Effect.either);

      expect(Either.isRight(failureOrSuccess)).toEqual(true);
    }));
  });

  it('should return fail if file not found', async () => {
    await Effect.runPromise(Effect.gen(function* () {
      const failureOrSuccess = yield* client(
        new UploadMediaRequest({
          md5Hash: 'asfsadasdf',
          deviceId: 'a1',
          originalFileName: 'file1.png',
          type: MediaType.PHOTO,
          filePath: '/a/file2.png',
          capturedAt: new Date(),
        })
      ).pipe(Effect.either);

      expect(Either.isLeft(failureOrSuccess)).toEqual(true);
      
      const error = Either.getLeft(failureOrSuccess);

      if (!Option.isSome(error)) {
        throw new Error('Error should be present');
      }

      expect(error.value.errorCode).toEqual('media_not_found');
    }));
  });
});
