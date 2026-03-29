import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository";
import { Effect } from "effect";
import type { FindMediaByHashRequest } from "../request/find-media-by-hash.request";
import {
  FindMediaByHashError,
  ERROR_CODE,
} from "../request/find-media-by-hash.request";

export const findMediaByHashHandler = (request: FindMediaByHashRequest) =>
  Effect.all([MediaMetadataRepository]).pipe(
    Effect.flatMap(([repo]) => repo.findByHash(request.sha256Hash)),
    Effect.flatMap((mediaMetadata) =>
      Effect.succeed({
        id: mediaMetadata.id,
        sha256Hash: mediaMetadata.sha256Hash,
        type: mediaMetadata.type,
        capturedAt: mediaMetadata.capturedAt,
        filePath: mediaMetadata.filePath,
      }),
    ),
    Effect.catchTag("MediaMetadataRepositoryError", (e) =>
      Effect.logError(e).pipe(
        Effect.flatMap(() =>
          Effect.fail(
            new FindMediaByHashError({
              errorCode:
                e.reason == "RecordNotFound"
                  ? ERROR_CODE.NOT_FOUND
                  : ERROR_CODE.SERVER_ERROR,
            }),
          ),
        ),
      ),
    ),
  );
