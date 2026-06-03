import { NodeHttpServer } from "@effect/platform-node";
import { HttpRouter } from "effect/unstable/http";
import { RpcServer, RpcSerialization } from "effect/unstable/rpc";
import { Layer, References } from "effect";
import { createServer } from "http";
import layers from "../layers.js";
import { MediaRpcs } from "./rpc-handler/rpc-definitions.js";
import { MediaRpcLive } from "./rpc-handler/media-rpc-handlers.js";

const RpcLayer = RpcServer.layer(MediaRpcs).pipe(Layer.provide(MediaRpcLive));

const HttpProtocol = RpcServer.layerProtocolHttp({
  path: "/rpc"
}).pipe(Layer.provide(RpcSerialization.layerJson));

const appLayer = RpcLayer.pipe(Layer.provideMerge(HttpProtocol), Layer.provideMerge(layers));

const logLevelLayer = Layer.succeed(References.MinimumLogLevel, "Info");

export const appServerFactory = (serverPort: number) =>
  HttpRouter.serve(appLayer).pipe(
    Layer.provide(NodeHttpServer.layerServer(createServer, { port: serverPort })),
    Layer.provideMerge(logLevelLayer)
  );
