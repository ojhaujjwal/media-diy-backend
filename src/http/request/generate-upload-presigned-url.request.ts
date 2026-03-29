import { Schema as S } from "effect";
import { MediaFileExtensionSchema, MediaType } from "../../domain/model/media";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error",
}

export class GenerateUploadPresignedUrlError extends S.Class<GenerateUploadPresignedUrlError>(
  "GenerateUploadPresignedUrlError",
)({
  errorCode: S.Enums(ERROR_CODE),
}) {}

export class PresignedUrlResponse extends S.Class<PresignedUrlResponse>(
  "PresignedUrlResponse",
)({
  presignedUrl: S.String,
  filePath: S.String,
}) {}

export class GenerateUploadPresignedUrlequest extends S.TaggedRequest<GenerateUploadPresignedUrlequest>()(
  "GenerateUploadPresignedUrlequest",
  {
    failure: GenerateUploadPresignedUrlError,
    success: PresignedUrlResponse,
    payload: {
      mediaType: S.Enums(MediaType),
      fileExtension: MediaFileExtensionSchema,
    },
  },
) {}
