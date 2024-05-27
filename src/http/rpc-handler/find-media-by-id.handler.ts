import { Rpc } from "@effect/rpc";
import { MediaMetadataRepository } from "domain/repository/media-metadata.repository";
import { Effect } from "effect";
import {
  FindMediaByIdError,
  FindMediaByIdRequest,
  ERROR_CODE,
} from "http/request/find-media-by-id.request";

export const findMediaByIdHandler = Rpc.effect<
  FindMediaByIdRequest,
  MediaMetadataRepository
>(FindMediaByIdRequest, (request: FindMediaByIdRequest) =>
  Effect.all([MediaMetadataRepository]).pipe(
    Effect.flatMap(([repo]) => repo.findById(request.ownerUserId, request.id)),
    Effect.flatMap((mediaMetadata) =>
      Effect.succeed({
        id: mediaMetadata.id,
        type: mediaMetadata.type,
        capturedAt: mediaMetadata.capturedAt,
        filePath: mediaMetadata.filePath,
      }),
    ),
    Effect.catchTag("MediaMetadataRepositoryError", (e) =>
      Effect.logError(e).pipe(
        Effect.flatMap(() =>
          Effect.fail(
            new FindMediaByIdError({
              errorCode:
                e.reason == "RecordNotFound"
                  ? ERROR_CODE.NOT_FOUND
                  : ERROR_CODE.SERVER_ERROR,
            }),
          ),
        ),
      ),
    ),
  ),
);
