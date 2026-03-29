import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";
import type { UploadMediaRequest } from "../request/upload-media.request";
import {
  UPLOAD_MEDIA_ERROR_CODE,
  UploadMediaError,
} from "../request/upload-media.request";
import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository";
import { errorHandler } from "./helpers";

const routeErrorHandler = errorHandler({
  failureResult: new UploadMediaError({
    errorCode: UPLOAD_MEDIA_ERROR_CODE.SERVER_ERROR,
  }),
});

export const uploadMediaHandler = (request: UploadMediaRequest) =>
  Effect.gen(function* () {
    const mediaContentsRepository = yield* MediaContentsRepository;

    const isFileExist = yield* mediaContentsRepository.isFileExist(
      request.filePath,
    );

    if (!isFileExist) {
      return yield* Effect.fail(
        new UploadMediaError({
          errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_NOT_FOUND,
        }),
      );
    }

    const ownerUserId = "a208ada0-8862-4ede-b45d-8ec34742bbbd";

    const mediaMetadataRepository = yield* MediaMetadataRepository;

    // findById is used as an existence check: if record exists, fail; if not found, continue to create
    yield* mediaMetadataRepository.findById(ownerUserId, request.id).pipe(
      Effect.flatMap(() =>
        Effect.fail(
          new UploadMediaError({
            errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS,
          }),
        ),
      ),
      Effect.catchTag("MediaMetadataRepositoryError", (e) =>
        e.reason === "RecordNotFound" ? Effect.void : Effect.fail(e),
      ),
    );

    yield* mediaMetadataRepository.create({
      originalFileName: request.originalFileName,
      deviceId: request.deviceId,
      filePath: request.filePath,
      md5Hash: request.md5Hash, // todo: check md5 hash
      type: request.type,
      capturedAt: request.capturedAt,
      uploadedAt: new Date(),
      id: request.id,
      ownerUserId,
    });
  }).pipe(
    Effect.catchTags({
      MediaMetadataRepositoryError: routeErrorHandler,
      MediaContentsRepositoryError: routeErrorHandler,
    }),
    Effect.catchAllDefect(routeErrorHandler),
  );
