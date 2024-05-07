import { Schema as S } from "@effect/schema";
import { MediaType } from "../../domain/model/media";
import { Rpc } from "@effect/rpc";
import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";

enum UPLOAD_MEDIA_ERROR_CODE {
  SERVER_ERROR = 'server_error',
  MEDIA_NOT_FOUND = 'media_not_found',
}

class UploadMediaError extends S.Class<UploadMediaError>('UploadMediaError')({
  errorCode: S.Enums(UPLOAD_MEDIA_ERROR_CODE),
}) {}

export class UploadMediaRequest extends S.TaggedRequest<UploadMediaRequest>()('UploadMediaRequest', UploadMediaError, S.Void, {
  md5Hash: S.String,
  originalFileName: S.String,
  type: S.Enums(MediaType),
  deviceId: S.String,
  filePath: S.String,
  capturedAt: S.Date,
}) {}


export const uploadMediaRouteHandler = Rpc.effect(UploadMediaRequest, (request: UploadMediaRequest) => {
  return MediaContentsRepository.pipe(
    Effect.flatMap((repo) => repo.move(request.filePath, `/media/${request.md5Hash}`)),
    Effect.flatMap(() => Effect.void),
    Effect.catchTag("MoveError", () =>
      Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_NOT_FOUND })
    )
  ))
})
