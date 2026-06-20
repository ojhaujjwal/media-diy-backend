import { Schema as S } from "effect";
import { MediaType } from "../../domain/model/media.js";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error",
  NOT_FOUND = "not_found"
}

export class FindMediaByIdError extends S.TaggedErrorClass<FindMediaByIdError>()("FindMediaByIdError", {
  errorCode: S.Enum(ERROR_CODE)
}) {}

export class FindMediaResponse extends S.Class<FindMediaResponse>("FindMediaResponse")({
  id: S.String.check(S.isUUID()),
  s3KeyFull: S.String,
  type: S.Enum(MediaType),
  capturedAt: S.Date
}) {}
