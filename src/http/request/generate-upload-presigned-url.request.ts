import { Schema as S } from "@effect/schema";
import { MediaFileExtensionSchema, MediaType } from "../../domain/model/media";

export enum ERROR_CODE {
  SERVER_ERROR = 'server_error',
}

export class GenerateUploadPresignedUrlError extends S.Class<GenerateUploadPresignedUrlError>('GenerateUploadPresignedUrlError')({
  errorCode: S.Enums(ERROR_CODE),
}) { }

export class PresignedUrlResponse extends S.Class<PresignedUrlResponse>("PresignedUrlResponse")({
  presignedUrl: S.String,
  filePath: S.String
}) {}


export class GenerateUploadPresignedUrlequest extends S.TaggedRequest<GenerateUploadPresignedUrlequest>()('GenerateUploadPresignedUrlequest', GenerateUploadPresignedUrlError, PresignedUrlResponse, {
  mediaType: S.Enums(MediaType),
  fileExtension: MediaFileExtensionSchema,
}) { }
