import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository.js";
import {
  ERROR_CODE,
  GenerateUploadPresignedUrlError,
  PresignedUrlResponse
} from "../request/generate-upload-presigned-url.request.js";
import { errorHandler } from "./helpers.js";

const generateFileName = (fileExtension: string) => {
  const today = new Date();
  return `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}/${crypto.randomUUID()}.${fileExtension}`;
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
    const s3KeyFull = generateFileName(fileExtension);
    const presignedUrl = yield* repo.generatePresignedUrlForUpload(mediaType, s3KeyFull);
    return new PresignedUrlResponse({ s3KeyFull, presignedUrl });
  }).pipe(
    Effect.catchTags({
      MediaContentsRepositoryError: routeErrorHandler
    })
  );
