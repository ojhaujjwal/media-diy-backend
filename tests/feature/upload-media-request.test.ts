import * as Http from "@effect/platform/HttpClient"
import { Resolver } from "@effect/rpc"
import { HttpResolver } from "@effect/rpc-http"
import type { ClientRouter } from "../../src/http/http-server"
import { UploadMediaRequest } from "../../src/http/request/upload-media.request";
import { MediaType } from "../../src/domain/model/media"
import { Effect, Either, Option, identity } from "effect"
import { describe, it, expect } from '@effect/vitest';

const rpcClient = HttpResolver.makeClient<ClientRouter>('http://localhost:3000/rpc');

describe('UploadMediaRequest', () => {
  it.effect('should return fail if file not found', () =>
    Effect.gen(function* () {
      const failureOrSuccess = yield* rpcClient(
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
    })
  );
});
