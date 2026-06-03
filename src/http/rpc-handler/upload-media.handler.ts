import { Effect } from "effect";
import { UPLOAD_MEDIA_ERROR_CODE, UploadMediaError } from "../request/upload-media.request.js";
import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository.js";
import { errorHandler } from "./helpers.js";

const routeErrorHandler = errorHandler({
  failureResult: new UploadMediaError({
    errorCode: UPLOAD_MEDIA_ERROR_CODE.SERVER_ERROR
  })
});

export const uploadMediaHandler = ({
  sha256Hash,
  originalFileName,
  type,
  deviceId,
  filePath,
  capturedAt,
  id
}: {
  readonly sha256Hash: string;
  readonly originalFileName: string;
  readonly type: "photo" | "video" | "live_photo";
  readonly deviceId: string;
  readonly filePath: string;
  readonly capturedAt: Date;
  readonly id: string;
}) =>
  Effect.gen(function* () {
    const ownerUserId = "a208ada0-8862-4ede-b45d-8ec34742bbbd";

    const mediaMetadataRepository = yield* MediaMetadataRepository;

    yield* mediaMetadataRepository.findById(ownerUserId, id).pipe(
      Effect.flatMap(() =>
        Effect.fail(
          new UploadMediaError({
            errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS
          })
        )
      ),
      Effect.catchTag("MediaMetadataRepositoryError", (e) =>
        e.reason === "RecordNotFound" ? Effect.void : Effect.fail(e)
      )
    );

    yield* mediaMetadataRepository.create({
      originalFileName,
      deviceId,
      filePath,
      sha256Hash,
      type,
      capturedAt,
      uploadedAt: new Date(),
      id,
      ownerUserId
    });
  }).pipe(
    Effect.catchTags({
      MediaMetadataRepositoryError: routeErrorHandler
    }),
    Effect.catchDefect(routeErrorHandler)
  );
