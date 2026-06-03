import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository.js";
import { randomUUID } from "crypto";
import {
  ERROR_CODE,
  GenerateUploadPresignedUrlError,
  PresignedUrlResponse
} from "../request/generate-upload-presigned-url.request.js";
import { errorHandler } from "./helpers.js";

const generateFileName = (fileExtension: string) => {
  const today = new Date();
  return `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}/${randomUUID()}.${fileExtension}`;
};

const routeErrorHandler = errorHandler({
  failureResult: new GenerateUploadPresignedUrlError({
    errorCode: ERROR_CODE.SERVER_ERROR
  })
});

export const generateUploadPresignedUrlHandler = ({
  mediaType,
  fileExtension
}: {
  readonly mediaType: string;
  readonly fileExtension: string;
}) =>
  Effect.gen(function* () {
    const repo = yield* MediaContentsRepository;
    const filePath = generateFileName(fileExtension);
    const presignedUrl = yield* repo.generatePresignedUrlForUpload(mediaType, filePath);
    return new PresignedUrlResponse({ filePath, presignedUrl });
  }).pipe(
    Effect.catchTags({
      MediaContentsRepositoryError: routeErrorHandler
    })
  );
