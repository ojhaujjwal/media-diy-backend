import { Schema as S } from "@effect/schema";
import { MediaFileExtension, MediaFileExtensionSchema, MediaType } from "../../domain/model/media";
import { Rpc } from "@effect/rpc";
import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";
import { LocalDate } from "@js-joda/core";
import { randomUUID } from "crypto";

enum ERROR_CODE {
  SERVER_ERROR = 'server_error',
}

class GenerateUploadPresignedUrlError extends S.Class<GenerateUploadPresignedUrlError>('GenerateUploadPresignedUrlError')({
  errorCode: S.Enums(ERROR_CODE),
}) { }


const PresignedUrlResponse = S.Struct({
  presignedUrl: S.String,
  filePath: S.String
})

export class GenerateUploadPresignedUrlequest extends S.TaggedRequest<GenerateUploadPresignedUrlequest>()('GenerateUploadPresignedUrlequest', GenerateUploadPresignedUrlError, PresignedUrlResponse, {
  mediaType: S.Enums(MediaType),
  fileExtension: MediaFileExtensionSchema,
}) { }

const generateFileName = (fileExtension: MediaFileExtension) => {
  const today = LocalDate.now();
  return `${today.year()}/${today.monthValue()}/${today.dayOfMonth()}/${randomUUID()}.${fileExtension}`;
};

export const generateUploadPresignedUrlAction = Rpc.effect(GenerateUploadPresignedUrlequest, (request: GenerateUploadPresignedUrlequest) => {
  return Effect.all([MediaContentsRepository, Effect.succeed(generateFileName(request.fileExtension))]).pipe(
    Effect.flatMap(([repo, filePath]) => Effect.all([repo.generatePresignedUrlForUpload(request.mediaType, filePath), Effect.succeed(filePath)])),
    Effect.map(([presignedUrl, filePath]) => ({
      filePath,
      presignedUrl,
    })),
    Effect.catchTag("MediaContentsRepositoryError", (e) => {
      //TODO: log error properly
      console.error('error', e, e.previous);
      return Effect.fail(new GenerateUploadPresignedUrlError({ errorCode: ERROR_CODE.SERVER_ERROR }));
    }
  ))
})
