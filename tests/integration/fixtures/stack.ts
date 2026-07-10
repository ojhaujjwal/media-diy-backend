import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import Worker from "../../../src/http/worker.js";
import { MediaBucket } from "../../../src/resources/bucket.js";
import { MediaDb } from "../../../src/resources/db.js";

export default Alchemy.Stack(
  "MediaDiyIntegration",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state()
  },
  Effect.gen(function* () {
    const bucket = yield* MediaBucket;
    const db = yield* MediaDb;
    const worker = yield* Worker;

    return {
      url: worker.url.as<string>(),
      bucketName: bucket.bucketName,
      databaseId: db.databaseId,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? ""
    };
  })
);
