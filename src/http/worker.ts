import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
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

const Worker: Effect.Effect<Cloudflare.Worker, never, Cloudflare.Providers> = Cloudflare.Worker(
  "MediaWorker",
  {
    main: import.meta.filename,
    compatibility: { flags: ["nodejs_compat"] },
    env: {
      R2_ACCOUNT_ID: Config.string("R2_ACCOUNT_ID"),
      R2_BUCKET_NAME: Config.string("R2_BUCKET_NAME"),
      R2_ACCESS_KEY_ID: Config.redacted("R2_ACCESS_KEY_ID"),
      R2_SECRET_ACCESS_KEY: Config.redacted("R2_SECRET_ACCESS_KEY")
    }
  },
  Effect.map(impl, (fetch) => ({ fetch }))
);

export default Worker;
