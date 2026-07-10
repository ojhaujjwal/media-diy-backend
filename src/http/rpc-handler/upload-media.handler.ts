import { Clock, DateTime, Effect } from "effect";
import { UPLOAD_MEDIA_ERROR_CODE, UploadMediaError } from "../request/upload-media.request.js";
import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository.js";
import type { UploadMediaRequest } from "./rpc-definitions.js";
import type { Rpc } from "effect/unstable/rpc";
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
  s3KeyFull,
  s3KeyThumb,
  capturedAt,
  id,
  smbPath,
  fileSize,
  fileMtime,
  exif
}: Rpc.Payload<typeof UploadMediaRequest>) =>
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

    const nowMs = yield* Clock.currentTimeMillis;

    yield* mediaMetadataRepository.create({
      originalFileName,
      deviceId,
      s3KeyFull,
      s3KeyThumb,
      sha256Hash,
      type,
      smbPath,
      fileSize,
      fileMtime,
      exif,
      capturedAt,
      uploadedAt: DateTime.makeUnsafe(nowMs),
      id,
      ownerUserId
    });
  }).pipe(
    Effect.catchTags({
      MediaMetadataRepositoryError: routeErrorHandler
    }),
    Effect.catchDefect(routeErrorHandler)
  );
