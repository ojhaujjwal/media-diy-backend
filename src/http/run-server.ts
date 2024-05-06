import { Effect, Layer } from "effect";
import { HttpServer } from "./http-server";
import { NodeRuntime } from "@effect/platform-node";
import { MediaContentsRepositoryLive } from "infrastructure/persistence/media-contents.repository.live";

Layer.launch(HttpServer).pipe(
  Effect.provide(MediaContentsRepositoryLive),
  NodeRuntime.runMain,
)
