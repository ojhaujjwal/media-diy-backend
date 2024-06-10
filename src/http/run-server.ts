import { appServerFactory } from "./app-server-factory";
import { NodeRuntime } from "@effect/platform-node";

NodeRuntime.runMain(
  appServerFactory(
    process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000,
  ),
);
