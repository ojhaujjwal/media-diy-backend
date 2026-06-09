import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { RpcServer, RpcSerialization } from "effect/unstable/rpc";
import { MediaRpcs } from "./rpc-handler/rpc-definitions.js";
import { MediaRpcLive } from "./rpc-handler/media-rpc-handlers.js";
import { MediaContentsR2Live } from "../infrastructure/persistence/media-contents.r2.js";
import { MediaMetadataD1Live } from "../infrastructure/persistence/media-metadata.d1.js";

const infraLayer = Layer.mergeAll(Cloudflare.R2BucketBindingLive, Cloudflare.D1ConnectionLive);

const repoLayer = Layer.mergeAll(MediaContentsR2Live, MediaMetadataD1Live).pipe(Layer.provide(infraLayer));

const appLayer = MediaRpcLive.pipe(Layer.provideMerge(repoLayer), Layer.provideMerge(RpcSerialization.layerJson));

const impl = RpcServer.toHttpEffect(MediaRpcs).pipe(Effect.provide(appLayer));

export default Cloudflare.Worker(
  "MediaWorker",
  {
    main: import.meta.filename,
    compatibility: { flags: ["nodejs_compat"] }
  },
  Effect.map(impl, (fetch) => ({ fetch }))
);
