import { MediaFileExtension } from "../../domain/model/media";
import { Rpc } from "@effect/rpc";
import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";
import { LocalDate } from "@js-joda/core";
import { randomUUID } from "crypto";
import { ERROR_CODE, GenerateUploadPresignedUrlequest, GenerateUploadPresignedUrlError } from "http/request/generate-upload-presigned-url.request";
import { errorHandler } from "./helpers";

const generateFileName = (fileExtension: MediaFileExtension) => {
  const today = LocalDate.now();
  return `${today.year()}/${today.monthValue()}/${today.dayOfMonth()}/${randomUUID()}.${fileExtension}`;
};
const routeErrorHandler = errorHandler({ failureResult: new GenerateUploadPresignedUrlError({ errorCode: ERROR_CODE.SERVER_ERROR }) });

export const generateUploadPresignedUrlHandler = Rpc.effect<GenerateUploadPresignedUrlequest, MediaContentsRepository>(GenerateUploadPresignedUrlequest, (request: GenerateUploadPresignedUrlequest) => {
  return Effect.all([MediaContentsRepository, Effect.succeed(generateFileName(request.fileExtension))]).pipe(
    Effect.flatMap(([repo, filePath]) => Effect.all([repo.generatePresignedUrlForUpload(request.mediaType, filePath), Effect.succeed(filePath)])),
    Effect.map(([presignedUrl, filePath]) => ({
      filePath,
      presignedUrl,
    })),
    Effect.catchTags({
      MediaContentsRepositoryError:  routeErrorHandler,
    })
  )
})
