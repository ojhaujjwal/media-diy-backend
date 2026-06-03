import { Schema as S } from "effect";

export enum UPLOAD_MEDIA_ERROR_CODE {
  SERVER_ERROR = "server_error",
  MEDIA_NOT_FOUND = "media_not_found",
  MEDIA_ALREADY_EXISTS = "media_already_exists"
}

export class UploadMediaError extends S.TaggedErrorClass<UploadMediaError>()("UploadMediaError", {
  errorCode: S.Enum(UPLOAD_MEDIA_ERROR_CODE)
}) {}
