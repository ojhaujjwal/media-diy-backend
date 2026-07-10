import { Effect } from "effect";
import type { DateTime } from "effect";
import { SearchMediaError, SearchMediaResponse, MediaSummary, ERROR_CODE } from "../request/search-media.request.js";
import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository.js";
import { errorHandler } from "./helpers.js";

const routeErrorHandler = errorHandler({
  failureResult: new SearchMediaError({
    errorCode: ERROR_CODE.SERVER_ERROR
  })
});

export const searchMediaHandler = (payload: {
  readonly ownerUserId: string;
  readonly dateFrom?: DateTime.Utc | undefined;
  readonly dateTo?: DateTime.Utc | undefined;
  readonly cameraMake?: string | undefined;
  readonly cameraModel?: string | undefined;
  readonly gpsLatMin?: number | undefined;
  readonly gpsLatMax?: number | undefined;
  readonly gpsLonMin?: number | undefined;
  readonly gpsLonMax?: number | undefined;
  readonly limit: number;
  readonly offset: number;
}) =>
  Effect.gen(function* () {
    const repo = yield* MediaMetadataRepository;
    const { results, total } = yield* repo.searchMedia({
      ownerUserId: payload.ownerUserId,
      ...(payload.dateFrom !== undefined ? { dateFrom: payload.dateFrom } : {}),
      ...(payload.dateTo !== undefined ? { dateTo: payload.dateTo } : {}),
      ...(payload.cameraMake !== undefined ? { cameraMake: payload.cameraMake } : {}),
      ...(payload.cameraModel !== undefined ? { cameraModel: payload.cameraModel } : {}),
      ...(payload.gpsLatMin !== undefined ? { gpsLatMin: payload.gpsLatMin } : {}),
      ...(payload.gpsLatMax !== undefined ? { gpsLatMax: payload.gpsLatMax } : {}),
      ...(payload.gpsLonMin !== undefined ? { gpsLonMin: payload.gpsLonMin } : {}),
      ...(payload.gpsLonMax !== undefined ? { gpsLonMax: payload.gpsLonMax } : {}),
      limit: payload.limit,
      offset: payload.offset
    });

    const summaries = results.map(
      (media) =>
        new MediaSummary({
          id: media.id,
          s3KeyFull: media.s3KeyFull,
          s3KeyThumb: media.s3KeyThumb,
          type: media.type,
          capturedAt: media.capturedAt,
          cameraMake: media.exif?.make,
          cameraModel: media.exif?.model
        })
    );

    return new SearchMediaResponse({ results: summaries, total });
  }).pipe(
    Effect.catchTags({
      MediaMetadataRepositoryError: routeErrorHandler
    }),
    Effect.catchDefect(routeErrorHandler)
  );
