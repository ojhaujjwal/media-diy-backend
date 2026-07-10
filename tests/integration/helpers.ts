import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import * as d1 from "@distilled.cloud/cloudflare/d1";

export type StackOutputs = {
  readonly url: string;
  readonly bucketName: string;
  readonly databaseId: string;
};

// — RPC client helpers —

export const clientLayer = (url: string) =>
  RpcClient.layerProtocolHttp({ url }).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(Layer.succeed(RpcSerialization.RpcSerialization, RpcSerialization.json))
  );

class WorkerNotReady extends Data.TaggedError("WorkerNotReady")<{
  readonly status: number;
  readonly body: string;
}> {}

const readinessSchedule = Schedule.exponential("500 millis").pipe(Schedule.either(Schedule.spaced("3 seconds")));

export const retryReadyN =
  (times: number) =>
  <A, E, R>(eff: Effect.Effect<A, E, R>) =>
    eff.pipe(
      Effect.catchDefect((defect) => Effect.fail(new WorkerNotReady({ status: 0, body: String(defect) }))),
      Effect.retry({ schedule: readinessSchedule, times })
    );

// — D1 query helpers —

import * as CloudflareCloud from "@distilled.cloud/cloudflare";

export const d1QueryLayer = Layer.mergeAll(FetchHttpClient.layer, CloudflareCloud.CredentialsFromEnv);

export const queryAll = (accountId: string, databaseId: string, sql: string) =>
  Effect.gen(function* () {
    const queryDb = yield* d1.queryDatabase;
    const result = yield* queryDb({ accountId, databaseId, sql });
    return result.result[0]?.results ?? [];
  }).pipe(Effect.provide(d1QueryLayer));

export const waitForRows = (
  accountId: string,
  databaseId: string,
  sql: string,
  predicate: (rows: ReadonlyArray<unknown>) => boolean = (rows) => rows.length > 0
) =>
  queryAll(accountId, databaseId, sql).pipe(
    Effect.flatMap((rows) =>
      predicate(rows) ? Effect.succeed(rows) : Effect.fail(new WorkerNotReady({ status: 0, body: "no rows yet" }))
    ),
    Effect.retry({
      while: (e): e is WorkerNotReady => e instanceof WorkerNotReady,
      schedule: Schedule.exponential("500 millis").pipe(Schedule.both(Schedule.recurs(20)))
    }),
    Effect.catchTag("WorkerNotReady", (e) => Effect.orDie(e))
  );
