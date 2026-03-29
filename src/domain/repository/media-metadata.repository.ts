import type { MediaMetadata } from "../../domain/model/media";
import type { Effect } from "effect";
import { Data, Context } from "effect";

export type ErrorReason = "UnknownError";

export type FindByIdErrorReason = ErrorReason | "RecordNotFound";

export type FindByHashErrorReason = ErrorReason | "RecordNotFound";

export class MediaMetadataRepositoryError<
  T extends string = ErrorReason,
> extends Data.TaggedError("MediaMetadataRepositoryError")<{
  message: string;
  reason: T;
  previous?: Error;
}> {}

export class MediaMetadataRepository extends Context.Tag(
  "MediaMetadataRepository",
)<
  MediaMetadataRepository,
  {
    readonly create: (
      MediaMetadata: MediaMetadata,
    ) => Effect.Effect<void, MediaMetadataRepositoryError, never>;

    readonly findById: (
      ownerUserId: string,
      mediaId: string,
    ) => Effect.Effect<
      MediaMetadata,
      MediaMetadataRepositoryError<FindByIdErrorReason>,
      never
    >;

    readonly findByHash: (
      sha256Hash: string,
    ) => Effect.Effect<
      MediaMetadata,
      MediaMetadataRepositoryError<FindByHashErrorReason>,
      never
    >;
  }
>() {}
