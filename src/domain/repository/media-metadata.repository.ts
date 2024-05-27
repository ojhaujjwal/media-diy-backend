import { MediaMetadata } from "../../domain/model/media";
import { Effect, Data, Context } from "effect";

export type ErrorReason = "UnknownError";

export type FindByIdErrorReason = ErrorReason | "RecordNotFound";

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
    ) => Effect.Effect<void, MediaMetadataRepositoryError, any>;

    readonly findById: (
      ownerUserId: string,
      mediaId: string,
    ) => Effect.Effect<
      MediaMetadata,
      MediaMetadataRepositoryError<FindByIdErrorReason>,
      any
    >;
  }
>() {}
