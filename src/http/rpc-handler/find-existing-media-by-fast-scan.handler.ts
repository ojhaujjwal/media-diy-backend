import { Effect } from "effect";
import { FastScanError, FastScanResponse, ERROR_CODE } from "../request/find-existing-media-by-fast-scan.request.js";
import { MediaMetadataRepository } from "../../domain/repository/media-metadata.repository.js";
import { errorHandler } from "./helpers.js";

const routeErrorHandler = errorHandler({
  failureResult: new FastScanError({
    errorCode: ERROR_CODE.SERVER_ERROR
  })
});

export const findExistingMediaByFastScanHandler = ({
  tuples
}: {
  readonly tuples: ReadonlyArray<{ readonly smbPath: string; readonly fileSize: number; readonly fileMtime: string }>;
}) =>
  Effect.gen(function* () {
    const repo = yield* MediaMetadataRepository;
    const existingSmbPaths = yield* repo.findExistingSmbPaths(tuples);
    return new FastScanResponse({ existingSmbPaths });
  }).pipe(
    Effect.catchTags({
      MediaMetadataRepositoryError: routeErrorHandler
    }),
    Effect.catchDefect(routeErrorHandler)
  );
