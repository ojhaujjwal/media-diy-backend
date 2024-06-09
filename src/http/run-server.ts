import { Effect, Layer, Logger, LogLevel } from "effect";
import { HttpServerFactory } from "./http-server-factory";
import { NodeRuntime } from "@effect/platform-node";
import layers from "../layers";

Layer.launch(
  HttpServerFactory(
    process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000,
  ),
).pipe(
  Effect.provide(layers),
  Logger.withMinimumLogLevel(LogLevel.Info),
  NodeRuntime.runMain,
);
