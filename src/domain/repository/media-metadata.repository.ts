import type { MediaMetadata } from "../../domain/model/media.js";
import type { Effect } from "effect";
import { Context, Schema as S } from "effect";

export type ErrorReason = "UnknownError" | "RecordNotFound";

export class MediaMetadataRepositoryError extends S.TaggedErrorClass<MediaMetadataRepositoryError>()(
  "MediaMetadataRepositoryError",
  {
    message: S.String,
    reason: S.String,
    previous: S.optional(S.Defect())
  }
) {}

export class MediaMetadataRepository extends Context.Service<
  MediaMetadataRepository,
  {
    readonly create: (MediaMetadata: MediaMetadata) => Effect.Effect<void, MediaMetadataRepositoryError, never>;

    readonly findById: (
      ownerUserId: string,
      mediaId: string
    ) => Effect.Effect<MediaMetadata, MediaMetadataRepositoryError, never>;

    readonly findByHash: (sha256Hash: string) => Effect.Effect<MediaMetadata, MediaMetadataRepositoryError, never>;

    readonly findExistingSmbPaths: (
      tuples: ReadonlyArray<{ readonly smbPath: string; readonly fileSize: number; readonly fileMtime: string }>
    ) => Effect.Effect<ReadonlyArray<string>, MediaMetadataRepositoryError, never>;

    readonly searchMedia: (criteria: {
      readonly ownerUserId: string;
      readonly dateFrom?: Date;
      readonly dateTo?: Date;
      readonly cameraMake?: string;
      readonly cameraModel?: string;
      readonly gpsLatMin?: number;
      readonly gpsLatMax?: number;
      readonly gpsLonMin?: number;
      readonly gpsLonMax?: number;
      readonly limit: number;
      readonly offset: number;
    }) => Effect.Effect<
      { readonly results: ReadonlyArray<MediaMetadata>; readonly total: number },
      MediaMetadataRepositoryError,
      never
    >;
  }
>()("MediaMetadataRepository") {}
