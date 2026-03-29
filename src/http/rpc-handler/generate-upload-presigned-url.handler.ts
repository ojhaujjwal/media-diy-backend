import type { MediaFileExtension } from "../../domain/model/media";
import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";
import { randomUUID } from "crypto";
import type { GenerateUploadPresignedUrlequest } from "../request/generate-upload-presigned-url.request";
import {
  ERROR_CODE,
  GenerateUploadPresignedUrlError,
} from "../request/generate-upload-presigned-url.request";
import { errorHandler } from "./helpers";

const generateFileName = (fileExtension: MediaFileExtension) => {
  const today = new Date();
  return `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}/${randomUUID()}.${fileExtension}`;
};
const routeErrorHandler = errorHandler({
  failureResult: new GenerateUploadPresignedUrlError({
    errorCode: ERROR_CODE.SERVER_ERROR,
  }),
});

export const generateUploadPresignedUrlHandler = (
  request: GenerateUploadPresignedUrlequest,
) => {
  return Effect.all([
    MediaContentsRepository,
    Effect.succeed(generateFileName(request.fileExtension)),
  ]).pipe(
    Effect.flatMap(([repo, filePath]) =>
      Effect.all([
        repo.generatePresignedUrlForUpload(request.mediaType, filePath),
        Effect.succeed(filePath),
      ]),
    ),
    Effect.map(([presignedUrl, filePath]) => ({
      filePath,
      presignedUrl,
    })),
    Effect.catchTags({
      MediaContentsRepositoryError: routeErrorHandler,
    }),
  );
};
