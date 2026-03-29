import { NodeHttpServer } from "@effect/platform-node";
import { HttpRouter } from "@effect/platform";
import * as RpcServer from "@effect/rpc/RpcServer";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import { Layer, Logger, LogLevel } from "effect";
import { createServer } from "http";
import layers from "../layers";
import { MediaRpcs } from "./rpc-handler/rpc-definitions";
import { MediaRpcLive } from "./rpc-handler/media-rpc-handlers";

const RpcLayer = RpcServer.layer(MediaRpcs).pipe(Layer.provide(MediaRpcLive));

const HttpProtocol = RpcServer.layerProtocolHttp({
  path: "/rpc",
}).pipe(Layer.provide(RpcSerialization.layerJson));

export type ClientRouter = typeof RpcLayer;

export const appServerFactory = (serverPort: number) =>
  HttpRouter.Default.serve().pipe(
    Layer.provide(RpcLayer),
    Layer.provide(HttpProtocol),
    Layer.provide(layers),
    Layer.provide(NodeHttpServer.layer(createServer, { port: serverPort })),
    Layer.provide(Logger.minimumLogLevel(LogLevel.Info)),
    Layer.launch,
  );
