import * as Cloudflare from "alchemy/Cloudflare";
import * as Test from "alchemy/Test/Vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import { DateTime, Schema as S } from "effect";
import { RpcClient } from "effect/unstable/rpc";
import { clientLayer, d1QueryLayer, queryAll, retryReadyN } from "./helpers.js";
import { MediaRpcs } from "../../src/http/rpc-handler/rpc-definitions.js";
import { MediaType } from "../../src/domain/model/media.js";
import Stack from "./fixtures/stack.js";

const hasToken = process.env.CLOUDFLARE_API_TOKEN !== undefined;

const TEST_OWNER_ID = "a208ada0-8862-4ede-b45d-8ec34742bbbd";
const randomUUID = () => crypto.randomUUID();
const randomHash = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const makeUploadPayload = (
  overrides: Partial<{
    id: string;
    sha256Hash: string;
    originalFileName: string;
    smbPath: string;
    fileSize: number;
    fileMtime: string;
    capturedAt: DateTime.Utc;
    cameraMake: string;
    cameraModel: string;
    gpsLat: number;
    gpsLon: number;
  }> = {}
): {
  readonly id: string;
  readonly sha256Hash: string;
  readonly originalFileName: string;
  readonly type: MediaType;
  readonly deviceId: string;
  readonly s3KeyFull: string;
  readonly capturedAt: DateTime.Utc;
  readonly smbPath: string;
  readonly fileSize: number;
  readonly fileMtime: string;
  readonly exif: {
    readonly width: number;
    readonly height: number;
    readonly make?: string;
    readonly model?: string;
    readonly gps?: { readonly latitude?: number; readonly longitude?: number };
  };
} => {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    sha256Hash: overrides.sha256Hash ?? randomHash(),
    originalFileName: overrides.originalFileName ?? "test.jpg",
    type: MediaType.PHOTO,
    deviceId: "test-device",
    s3KeyFull: `2026/1/1/${id}.jpg`,
    smbPath: overrides.smbPath ?? `/share/${id}.jpg`,
    fileSize: overrides.fileSize ?? 1024,
    fileMtime: overrides.fileMtime ?? "1700000000",
    capturedAt: overrides.capturedAt ?? DateTime.makeUnsafe("2026-01-15T12:00:00Z"),
    exif: {
      width: 1920,
      height: 1080,
      ...(overrides.cameraMake !== undefined ? { make: overrides.cameraMake } : {}),
      ...(overrides.cameraModel !== undefined ? { model: overrides.cameraModel } : {}),
      ...(overrides.gpsLat !== undefined && overrides.gpsLon !== undefined
        ? { gps: { latitude: overrides.gpsLat, longitude: overrides.gpsLon } }
        : {})
    }
  };
};

const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
  providers: Cloudflare.providers(),
  stage: "test"
});

const stackOutputs = beforeAll(deploy(Stack), { timeout: 180_000 });
afterAll.skipIf(process.env.NO_DESTROY !== undefined)(destroy(Stack), { timeout: 180_000 });

test.skipIf(!hasToken)(
  "UploadMedia round-trip via FindMediaById",
  Effect.gen(function* () {
    const { url, accountId, databaseId } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const payload = makeUploadPayload();

      yield* client.UploadMediaRequest(payload).pipe(retryReadyN(5));

      const found = yield* client
        .FindMediaByIdRequest({ ownerUserId: TEST_OWNER_ID, id: payload.id })
        .pipe(retryReadyN(5));

      expect(found.id).toBe(payload.id);

      const rows = S.decodeUnknownSync(S.Array(S.Struct({ id: S.String })))(
        yield* queryAll(accountId, databaseId, `SELECT id FROM media_metadata WHERE id = '${payload.id}'`)
      );
      expect(rows).toHaveLength(1);
    }).pipe(Effect.scoped, Effect.provide(Layer.mergeAll(clientLayer(url), d1QueryLayer)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "UploadMedia duplicate id returns MEDIA_ALREADY_EXISTS",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const payload = makeUploadPayload();

      yield* client.UploadMediaRequest(payload).pipe(retryReadyN(5));

      const duplicate = yield* client.UploadMediaRequest(payload).pipe(Effect.result);
      expect(Result.isSuccess(duplicate)).toBe(false);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "SearchMedia returns uploaded media by owner",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const payload = makeUploadPayload();

      yield* client.UploadMediaRequest(payload).pipe(retryReadyN(5));

      const result = yield* client
        .SearchMediaRequest({
          ownerUserId: TEST_OWNER_ID,
          limit: 100,
          offset: 0
        })
        .pipe(retryReadyN(5));

      expect(result.results.some((r) => r.id === payload.id)).toBe(true);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "FindMediaById returns MEDIA_NOT_FOUND for missing id",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const result = yield* client
        .FindMediaByIdRequest({
          ownerUserId: TEST_OWNER_ID,
          id: "00000000-0000-0000-0000-000000000000"
        })
        .pipe(Effect.result);

      expect(Result.isSuccess(result)).toBe(false);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "FindExistingMediaByFastScan returns matches",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const smbPath = `/share/smoke-${randomUUID()}.jpg`;

      yield* client.UploadMediaRequest(makeUploadPayload({ smbPath })).pipe(retryReadyN(5));

      const result = yield* client
        .FindExistingMediaByFastScanRequest({
          tuples: [{ smbPath, fileSize: 1024, fileMtime: "1700000000" }]
        })
        .pipe(retryReadyN(5));

      expect(result.existingSmbPaths.length).toBeGreaterThan(0);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);
