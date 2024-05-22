import { NodeHttpServer } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpServer"
import { Router } from "@effect/rpc"
import { HttpRouter } from "@effect/rpc-http"
import { Layer } from "effect"
import { createServer } from "http"
import { uploadMediaRouteHandler } from "./rpc-handler/upload-media.handler"
import { generateUploadPresignedUrlHandler } from "./rpc-handler/generate-upload-presigned-url.handler"
import { findMediaByIdHandler } from "./rpc-handler/find-media-by-id.handler"

const rpcRouter = Router.make(
  uploadMediaRouteHandler,
  generateUploadPresignedUrlHandler,
  findMediaByIdHandler,
)

export type ClientRouter = typeof rpcRouter

export const HttpServer = Http.router.empty.pipe(
  Http.router.post("/rpc", HttpRouter.toHttpApp(rpcRouter)),
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(
    NodeHttpServer.server.layer(
      createServer,
      { port: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000 }
    )
  )
)
