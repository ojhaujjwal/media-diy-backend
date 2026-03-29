import { Schema as S } from "effect";
import { MediaType } from "../../domain/model/media";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error",
  NOT_FOUND = "not_found",
}

export class FindMediaByHashError extends S.TaggedError<FindMediaByHashError>()(
  "FindMediaByHashError",
  {
    errorCode: S.Enums(ERROR_CODE),
  },
) {}

export class FindMediaByHashResponse extends S.Class<FindMediaByHashResponse>(
  "FindMediaByHashResponse",
)({
  id: S.UUID,
  sha256Hash: S.String,
  filePath: S.String,
  type: S.Enums(MediaType),
  capturedAt: S.Date,
}) {}

export class FindMediaByHashRequest extends S.TaggedRequest<FindMediaByHashRequest>()(
  "FindMediaByHashRequest",
  {
    failure: FindMediaByHashError,
    success: FindMediaByHashResponse,
    payload: {
      sha256Hash: S.String,
    },
  },
) {}
