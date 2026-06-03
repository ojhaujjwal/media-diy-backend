import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository.js";
import { Effect } from "effect";
import { FindMediaByIdError, ERROR_CODE } from "../request/find-media-by-id.request.js";

export const findMediaByIdHandler = ({ ownerUserId, id }: { readonly ownerUserId: string; readonly id: string }) =>
  Effect.gen(function* () {
    const repo = yield* MediaMetadataRepository;
    const mediaMetadata = yield* repo.findById(ownerUserId, id);
    return {
      id: mediaMetadata.id,
      type: mediaMetadata.type,
      capturedAt: mediaMetadata.capturedAt,
      filePath: mediaMetadata.filePath
    };
  }).pipe(
    Effect.catchTag("MediaMetadataRepositoryError", (e) =>
      Effect.logError(e).pipe(
        Effect.flatMap(() =>
          Effect.fail(
            new FindMediaByIdError({
              errorCode: e.reason === "RecordNotFound" ? ERROR_CODE.NOT_FOUND : ERROR_CODE.SERVER_ERROR
            })
          )
        )
      )
    )
  );
