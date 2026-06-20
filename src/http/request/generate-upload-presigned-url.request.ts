import { Schema as S } from "effect";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error"
}

export class GenerateUploadPresignedUrlError extends S.Class<GenerateUploadPresignedUrlError>(
  "GenerateUploadPresignedUrlError"
)({
  errorCode: S.Enum(ERROR_CODE)
}) {}

export class PresignedUrlResponse extends S.Class<PresignedUrlResponse>("PresignedUrlResponse")({
  presignedUrl: S.String,
  s3KeyFull: S.String
}) {}
