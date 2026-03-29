import type { Effect } from "effect";
import { Data, Context } from "effect";

export type ErrorReason = "UnknownError";

export class MediaContentsRepositoryError<
  T extends string = ErrorReason,
> extends Data.TaggedError("MediaContentsRepositoryError")<{
  message: string;
  reason: T;
  previous?: Error;
}> {}

export class MediaContentsRepository extends Context.Tag(
  "MediaContentsRepository",
)<
  MediaContentsRepository,
  {
    readonly isFileExist: (
      fromPath: string,
    ) => Effect.Effect<boolean, MediaContentsRepositoryError, never>;

    readonly generatePresignedUrlForUpload: (
      contentType: string,
      filePath: string,
    ) => Effect.Effect<string, MediaContentsRepositoryError, never>;
  }
>() {}
