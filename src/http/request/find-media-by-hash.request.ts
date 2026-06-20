import { Schema as S } from "effect";
import { MediaType } from "../../domain/model/media.js";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error",
  NOT_FOUND = "not_found"
}

export class FindMediaByHashError extends S.TaggedErrorClass<FindMediaByHashError>()("FindMediaByHashError", {
  errorCode: S.Enum(ERROR_CODE)
}) {}

export class FindMediaByHashResponse extends S.Class<FindMediaByHashResponse>("FindMediaByHashResponse")({
  id: S.String.check(S.isUUID()),
  sha256Hash: S.String,
  s3KeyFull: S.String,
  type: S.Enum(MediaType),
  capturedAt: S.Date
}) {}
