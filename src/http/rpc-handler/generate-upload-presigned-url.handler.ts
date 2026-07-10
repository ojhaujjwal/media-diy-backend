import { Clock, DateTime, Effect, Random } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository.js";
import {
  ERROR_CODE,
  GenerateUploadPresignedUrlError,
  PresignedUrlResponse
} from "../request/generate-upload-presigned-url.request.js";
import { errorHandler } from "./helpers.js";

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
    const todayMs = yield* Clock.currentTimeMillis;
    const today = DateTime.makeUnsafe(todayMs);
    const { year, month, day } = DateTime.toPartsUtc(today);
    const uuid = yield* Random.next;
    const s3KeyFull = `${year}/${month}/${day}/${uuid}.${fileExtension}`;
    const presignedUrl = yield* repo.generatePresignedUrlForUpload(mediaType, s3KeyFull);
    return new PresignedUrlResponse({ s3KeyFull, presignedUrl });
  }).pipe(
    Effect.catchTags({
      MediaContentsRepositoryError: routeErrorHandler
    })
  );
