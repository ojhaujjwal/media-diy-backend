import { Rpc } from "@effect/rpc";
import { MediaMetadataRepository } from "domain/repository/media-metadata.repository";
import { Effect } from "effect";
import { FindMediaByIdError, FindMediaByIdRequest, FindMediaResponse } from "http/request/find-media-by-id.request";
import { ERROR_CODE } from "http/request/generate-upload-presigned-url.request";

export const findMediaByIdHandler = Rpc.effect<FindMediaByIdRequest, MediaMetadataRepository>(FindMediaByIdRequest, (request: FindMediaByIdRequest) =>
  Effect.all([MediaMetadataRepository]).pipe(
    Effect.flatMap(
      ([repo]) => repo.findById(request.ownerUserId, request.id)
    ),
    Effect.flatMap(
      (mediaMetadata) => Effect.succeed({
        id: mediaMetadata.id,
        type: mediaMetadata.type,
        capturedAt: mediaMetadata.capturedAt,
        filePath: mediaMetadata.filePath,
      })
    ),
    Effect.catchTag('MediaMetadataRepositoryError', (e) => {
      //console.error('error', e);
      return Effect.fail(new FindMediaByIdError({ errorCode: ERROR_CODE.SERVER_ERROR }));
    }),
  ),
);
