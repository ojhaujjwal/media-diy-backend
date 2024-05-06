import { MediaContentsRepository, MoveError } from "domain/repository/media-contents.repository";
import { Effect, Layer } from "effect";

export const MediaContentsRepositoryLive = Layer.succeed(
  MediaContentsRepository,
  MediaContentsRepository.of({
    move: (fromPath, toPath) => {
      //TODO: return failure effect if source not found
      //return Effect.fail(new MoveError({ message: "Source not found", reason: "SourceNotFound" }));


      //TODO: Implement the move method by integrating with AWS s3
      return Effect.void;
    }
  })
)
