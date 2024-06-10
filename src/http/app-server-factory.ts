import { NodeHttpServer } from "@effect/platform-node";
import * as Http from "@effect/platform/HttpServer";
import { Router } from "@effect/rpc";
import { HttpRouter } from "@effect/rpc-http";
import { createServer } from "http";
import { Effect, Layer, Logger, LogLevel } from "effect";
import layers from "../layers";
import { uploadMediaRouteHandler } from "./rpc-handler/upload-media.handler";
import { generateUploadPresignedUrlHandler } from "./rpc-handler/generate-upload-presigned-url.handler";
import { findMediaByIdHandler } from "./rpc-handler/find-media-by-id.handler";

const rpcRouter = Router.make(
  uploadMediaRouteHandler,
  generateUploadPresignedUrlHandler,
  findMediaByIdHandler,
);

export type ClientRouter = typeof rpcRouter;

export const httpServerFactory = (serverPort: number) =>
  Http.router.empty.pipe(
    Http.router.post("/rpc", HttpRouter.toHttpApp(rpcRouter)),
    Http.server.serve(Http.middleware.logger),
    Http.server.withLogAddress,
    Layer.provide(
      NodeHttpServer.server.layer(createServer, { port: serverPort }),
    ),
  );

export const appServerFactory = (
  serverPort: number,
): Effect.Effect<never, Http.error.ServeError, never> =>
  Layer.launch(httpServerFactory(serverPort)).pipe(
    Effect.provide(layers),
    Logger.withMinimumLogLevel(LogLevel.Info),
  );
