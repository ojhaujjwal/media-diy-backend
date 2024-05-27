import { Effect, Layer, Logger, LogLevel } from "effect";
import { HttpServer } from "./http-server";
import { NodeRuntime } from "@effect/platform-node";
import layers from "layers";

Layer.launch(HttpServer).pipe(
  Effect.provide(layers),
  Logger.withMinimumLogLevel(LogLevel.Info),
  NodeRuntime.runMain,
);
