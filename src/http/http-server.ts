import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import * as Http from "@effect/platform/HttpServer"
import { Router } from "@effect/rpc"
import { HttpRouter } from "@effect/rpc-http"
import { Layer } from "effect"
import { createServer } from "http"
import { uploadMediaRouteHandler } from "./controller/upload-media.action"

// Implement the RPC server router
const router = Router.make(
  uploadMediaRouteHandler,
)

export type ClientRouter = typeof router

// Create the http server
export const HttpServer = Http.router.empty.pipe(
  Http.router.post("/rpc", HttpRouter.toHttpApp(router)),
  Http.server.serve(Http.middleware.logger),
  Http.server.withLogAddress,
  Layer.provide(
    NodeHttpServer.server.layer(
      createServer,
      { port: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000 }
    )
  )
)
