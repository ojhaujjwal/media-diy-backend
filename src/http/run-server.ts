import { Effect } from "effect";
import { appServerFactory } from "./app-server-factory.js";
import { NodeRuntime } from "@effect/platform-node";

NodeRuntime.runMain(
  appServerFactory(process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000).pipe(Effect.orDie)
);
