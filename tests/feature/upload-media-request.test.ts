import * as Http from "@effect/platform/HttpClient"
import { Resolver } from "@effect/rpc"
import { HttpResolver } from "@effect/rpc-http"
import type { ClientRouter } from "../../src/http/http-server"
import { UploadMediaRequest } from "../../src/http/request/upload-media.request";
import { MediaType } from "../../src/domain/model/media"
import { Effect, Either, Option, identity } from "effect"
import { describe, it, expect } from '@effect/vitest';
import { RequestResolver } from "effect/RequestResolver";
import { Request } from "@effect/rpc/Rpc";
import { randomUUID } from "crypto";

const rpcClientResolver = HttpResolver.make<ClientRouter>(
  Http.client.fetchOk.pipe(
    Http.client.mapRequest(Http.request.prependUrl("http://localhost:3000/rpc"))
  )
)

const rpcClient = Resolver.toClient(rpcClientResolver as  RequestResolver<Request<any>, never>);

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
          id: randomUUID(),
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
