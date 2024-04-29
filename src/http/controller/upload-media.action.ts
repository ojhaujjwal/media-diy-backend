import { Schema as S } from "@effect/schema";
import { MediaType } from "../../model/media";
import { Rpc } from "@effect/rpc";
import { Effect } from "effect";

enum UPLOAD_MEDIA_ERROR_CODE {
  SERVER_ERROR = 'server_error',
  VALIDATION_FAILURE = 'validation_failure',
}

class UploadMediaError extends S.Class<UploadMediaError>('UploadMediaError')({
  errorCode: S.Enums(UPLOAD_MEDIA_ERROR_CODE),
}) {}

export class UploadMediaRequest extends S.TaggedRequest<UploadMediaRequest>()('UploadMediaRequest', UploadMediaError, S.Boolean, {
  md5Hash: S.String,
  originalFileName: S.String,
  type: S.Enums(MediaType),
  deviceId: S.String,
}) {}


export const uploadMediaRouteHandler = Rpc.effect(UploadMediaRequest, () => Effect.succeed(true))
