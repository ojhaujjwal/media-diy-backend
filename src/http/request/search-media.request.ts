import { Schema as S } from "effect";
import { MediaType } from "../../domain/model/media.js";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error"
}

export class SearchMediaError extends S.TaggedErrorClass<SearchMediaError>()("SearchMediaError", {
  errorCode: S.Enum(ERROR_CODE)
}) {}

export class MediaSummary extends S.Class<MediaSummary>("MediaSummary")({
  id: S.String.check(S.isUUID()),
  s3KeyFull: S.String,
  s3KeyThumb: S.optional(S.String),
  type: S.Enum(MediaType),
  capturedAt: S.Date,
  cameraMake: S.optional(S.String),
  cameraModel: S.optional(S.String)
}) {}

export class SearchMediaResponse extends S.Class<SearchMediaResponse>("SearchMediaResponse")({
  results: S.Array(MediaSummary),
  total: S.Number
}) {}
