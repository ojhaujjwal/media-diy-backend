import { Schema as S } from "@effect/schema";
import { MediaType } from "../../domain/model/media";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error",
  NOT_FOUND = "not_found",
}

export class FindMediaByIdError extends S.TaggedError<FindMediaByIdError>()(
  "FindMediaByIdError",
  {
    errorCode: S.Enums(ERROR_CODE),
  },
) {}

export class FindMediaResponse extends S.Class<FindMediaResponse>(
  "FindMediaResponse",
)({
  id: S.UUID,
  filePath: S.String,
  type: S.Enums(MediaType),
  capturedAt: S.Date,
}) {}

export class FindMediaByIdRequest extends S.TaggedRequest<FindMediaByIdRequest>()(
  "FindMediaByIdRequest",
  FindMediaByIdError,
  FindMediaResponse,
  {
    ownerUserId: S.UUID,
    id: S.UUID,
  },
) {}
