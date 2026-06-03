import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository.js";
import { Effect } from "effect";
import { FindMediaByHashError, FindMediaByHashResponse, ERROR_CODE } from "../request/find-media-by-hash.request.js";

export const findMediaByHashHandler = ({ sha256Hash }: { readonly sha256Hash: string }) =>
  Effect.gen(function* () {
    const repo = yield* MediaMetadataRepository;
    const mediaMetadata = yield* repo.findByHash(sha256Hash);
    return new FindMediaByHashResponse({
      id: mediaMetadata.id,
      sha256Hash: mediaMetadata.sha256Hash,
      type: mediaMetadata.type,
      capturedAt: mediaMetadata.capturedAt,
      filePath: mediaMetadata.filePath
    });
  }).pipe(
    Effect.catchTag("MediaMetadataRepositoryError", (e) =>
      Effect.logError(e).pipe(
        Effect.flatMap(() =>
          Effect.fail(
            new FindMediaByHashError({
              errorCode: e.reason === "RecordNotFound" ? ERROR_CODE.NOT_FOUND : ERROR_CODE.SERVER_ERROR
            })
          )
        )
      )
    )
  );
