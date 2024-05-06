import * as Http from "@effect/platform/HttpClient"
import { Resolver } from "@effect/rpc"
import { HttpResolver } from "@effect/rpc-http"
import type { ClientRouter } from "../../src/http/http-server"
import { UploadMediaRequest } from "../../src/http/controller/upload-media.action"
import { MediaType } from "../../src/domain/model/media"
import { Effect } from "effect"
import { describe, it, expect } from 'vitest';


// Create the client
const client = HttpResolver.make<ClientRouter>(
  Http.client.fetchOk.pipe(
    Http.client.mapRequest(Http.request.prependUrl("http://localhost:3000/rpc"))
  )
).pipe(Resolver.toClient)

describe('UploadMediaRequest', () => {
  it('should upload the media with valid request', async () => {
    Effect.gen(function* () {
      const response = yield* client(new UploadMediaRequest({
        md5Hash: 'asfsadasdf',
        deviceId: 'a1',
        originalFileName: 'file1.png',
        type: MediaType.PHOTO,
        filePath: '/a/b.png',
        capturedAt: new Date(),
      }));
      expect(response).toEqual(true);
    });
  });

  it.todo('should return fail if file not found');
});
