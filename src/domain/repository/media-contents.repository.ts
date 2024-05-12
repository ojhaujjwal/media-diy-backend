import { Effect, Data, Context } from "effect";


export type ErrorReason =
  | 'UnknownError';

// export type CheckFileErrorReason =
//   | ErrorReason
//   | "SourceNotFound";

export class MediaContentsRepositoryError<T extends string = ErrorReason> extends Data.TaggedError("MediaContentsRepositoryError")<{
  message: string,
  reason: T,
  previous?: Error | undefined,
}> { }

export class MediaContentsRepository extends Context.Tag("MediaContentsRepository")<
MediaContentsRepository,
  {
    readonly isFileExist: (
      fromPath: string,
    ) => Effect.Effect<boolean, MediaContentsRepositoryError, any>;

    readonly generatePresignedUrlForUpload: (
      contentType: string,
      filePath: string,
    ) => Effect.Effect<string, MediaContentsRepositoryError, any>;
  }
  >() { }
