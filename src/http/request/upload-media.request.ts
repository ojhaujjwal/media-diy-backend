import { Schema as S } from "@effect/schema";
import { MediaType } from "../../domain/model/media";

export enum UPLOAD_MEDIA_ERROR_CODE {
  SERVER_ERROR = "server_error",
  MEDIA_NOT_FOUND = "media_not_found",
  MEDIA_ALREADY_EXISTS = "media_already_exists",
}

export class UploadMediaError extends S.TaggedError<UploadMediaError>()(
  "UploadMediaError",
  {
    errorCode: S.Enums(UPLOAD_MEDIA_ERROR_CODE),
  },
) {}

export class UploadMediaRequest extends S.TaggedRequest<UploadMediaRequest>()(
  "UploadMediaRequest",
  UploadMediaError,
  S.Void,
  {
    md5Hash: S.String,
    originalFileName: S.String,
    type: S.Enums(MediaType),
    deviceId: S.String,
    filePath: S.String,
    capturedAt: S.Date,
    id: S.UUID,
  },
) {}
