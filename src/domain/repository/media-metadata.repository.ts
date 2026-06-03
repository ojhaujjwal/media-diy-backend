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
  }
>()("MediaMetadataRepository") {}
