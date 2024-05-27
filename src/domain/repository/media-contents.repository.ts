import { Effect, Data, Context } from "effect";

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
    ) => Effect.Effect<boolean, MediaContentsRepositoryError, any>; //eslint-disable-line @typescript-eslint/no-explicit-any

    readonly generatePresignedUrlForUpload: (
      contentType: string,
      filePath: string,
    ) => Effect.Effect<string, MediaContentsRepositoryError, any>; //eslint-disable-line @typescript-eslint/no-explicit-any
  }
>() {}
