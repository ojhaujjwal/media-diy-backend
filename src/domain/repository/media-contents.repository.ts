import { Effect, Data, Context } from "effect";

/**
 * @since 1.0.0
 * @category model
 */
export type MoveErrorReason =
  | "SourceNotFound"

export class MoveError extends Data.TaggedError("MoveError")<{
  message: string,
  reason: MoveErrorReason,
}> {}

// export interface MediaContentsRepository {
//     /**
//    * Copy a file or directory from `fromPath` to `toPath`.
//    *
//    * Equivalent to `cp -r`.
//    */
//     readonly move: (
//       fromPath: string,
//       toPath: string
//     ) => Effect.Effect<void, MoveError>
// }

export class MediaContentsRepository extends Context.Tag("MediaContentsRepository")<
MediaContentsRepository,
  {
    readonly move: (
      fromPath: string,
      toPath: string
    ) => Effect.Effect<void, MoveError>
  }
  >() { }
