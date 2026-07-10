import type { Effect } from "effect";
import { Context, Schema as S } from "effect";

export type ErrorReason = "UnknownError" | "NotFound";

export class MediaContentsRepositoryError extends S.TaggedErrorClass<MediaContentsRepositoryError>()(
  "MediaContentsRepositoryError",
  {
    message: S.String,
    reason: S.String,
    previous: S.optional(S.Defect())
  }
) {}

export class MediaContentsRepository extends Context.Service<
  MediaContentsRepository,
  {
    readonly isFileExist: (fromPath: string) => Effect.Effect<boolean, MediaContentsRepositoryError, never>;

    readonly generatePresignedUrlForUpload: (
      contentType: string,
      filePath: string
    ) => Effect.Effect<string, MediaContentsRepositoryError, never>;
  }
>()("ts-starter/domain/repository/media-contents.repository/MediaContentsRepository") {}
