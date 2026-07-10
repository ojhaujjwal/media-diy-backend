import * as Cloudflare from "alchemy/Cloudflare";
import * as Test from "alchemy/Test/Vitest";
import * as Effect from "effect/Effect";
import { DateTime } from "effect";
import { RpcClient } from "effect/unstable/rpc";
import { clientLayer, retryReadyN } from "./helpers.js";
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
    originalFileName: "test.jpg",
    type: MediaType.PHOTO,
    deviceId: "test-device",
    s3KeyFull: `2026/1/1/${id}.jpg`,
    capturedAt: overrides.capturedAt ?? DateTime.makeUnsafe("2026-01-15T12:00:00Z"),
    smbPath: `/share/${id}.jpg`,
    fileSize: 1024,
    fileMtime: "1700000000",
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
  "date range filter",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const date1 = DateTime.makeUnsafe("2026-01-10T12:00:00Z");
      const date2 = DateTime.makeUnsafe("2026-02-10T12:00:00Z");
      const id1 = randomUUID();
      const id2 = randomUUID();
      const id3 = randomUUID();

      yield* client.UploadMediaRequest(makeUploadPayload({ id: id1, capturedAt: date1 })).pipe(retryReadyN(5));
      yield* client.UploadMediaRequest(makeUploadPayload({ id: id2, capturedAt: date2 })).pipe(retryReadyN(5));
      yield* client
        .UploadMediaRequest(makeUploadPayload({ id: id3, capturedAt: DateTime.makeUnsafe("2026-03-15T12:00:00Z") }))
        .pipe(retryReadyN(5));

      const result = yield* client
        .SearchMediaRequest({
          ownerUserId: TEST_OWNER_ID,
          dateFrom: DateTime.makeUnsafe("2026-01-01T00:00:00Z"),
          dateTo: DateTime.makeUnsafe("2026-02-28T23:59:59Z"),
          limit: 100,
          offset: 0
        })
        .pipe(retryReadyN(5));

      const ids = result.results.map((r) => r.id);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids).not.toContain(id3);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "camera_make and camera_model filter",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const id1 = randomUUID();
      const id2 = randomUUID();
      const id3 = randomUUID();

      yield* client
        .UploadMediaRequest(makeUploadPayload({ id: id1, cameraMake: "Canon", cameraModel: "EOS R5" }))
        .pipe(retryReadyN(5));
      yield* client
        .UploadMediaRequest(makeUploadPayload({ id: id2, cameraMake: "Sony", cameraModel: "A7IV" }))
        .pipe(retryReadyN(5));
      yield* client
        .UploadMediaRequest(makeUploadPayload({ id: id3, cameraMake: "Nikon", cameraModel: "Z9" }))
        .pipe(retryReadyN(5));

      const result = yield* client
        .SearchMediaRequest({
          ownerUserId: TEST_OWNER_ID,
          cameraMake: "Sony",
          cameraModel: "A7IV",
          limit: 100,
          offset: 0
        })
        .pipe(retryReadyN(5));

      const ids = result.results.map((r) => r.id);
      expect(ids).toContain(id2);
      expect(ids).not.toContain(id1);
      expect(ids).not.toContain(id3);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "gps bounding box filter",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const id1 = randomUUID();
      const id2 = randomUUID();
      const id3 = randomUUID();

      yield* client
        .UploadMediaRequest(makeUploadPayload({ id: id1, gpsLat: 40.7128, gpsLon: -74.006 }))
        .pipe(retryReadyN(5));
      yield* client
        .UploadMediaRequest(makeUploadPayload({ id: id2, gpsLat: 34.0522, gpsLon: -118.2437 }))
        .pipe(retryReadyN(5));
      yield* client
        .UploadMediaRequest(makeUploadPayload({ id: id3, gpsLat: 51.5074, gpsLon: -0.1278 }))
        .pipe(retryReadyN(5));

      const result = yield* client
        .SearchMediaRequest({
          ownerUserId: TEST_OWNER_ID,
          gpsLatMin: 30,
          gpsLatMax: 45,
          gpsLonMin: -130,
          gpsLonMax: -60,
          limit: 100,
          offset: 0
        })
        .pipe(retryReadyN(5));

      const ids = result.results.map((r) => r.id);
      expect(ids).toContain(id1);
      expect(ids).toContain(id2);
      expect(ids).not.toContain(id3);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "pagination with limit and offset",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const uploadedIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const id = randomUUID();
        uploadedIds.push(id);
        yield* client
          .UploadMediaRequest(
            makeUploadPayload({
              id,
              capturedAt: DateTime.makeUnsafe(`2026-04-${String(i + 1).padStart(2, "0")}T12:00:00Z`)
            })
          )
          .pipe(retryReadyN(5));
      }

      const page1 = yield* client
        .SearchMediaRequest({
          ownerUserId: TEST_OWNER_ID,
          limit: 2,
          offset: 0
        })
        .pipe(retryReadyN(5));

      const page2 = yield* client
        .SearchMediaRequest({
          ownerUserId: TEST_OWNER_ID,
          limit: 2,
          offset: 2
        })
        .pipe(retryReadyN(5));

      expect(page1.results).toHaveLength(2);
      expect(page2.results).toHaveLength(2);
      expect(page1.results[0]?.id).not.toBe(page2.results[0]?.id);
      expect(page1.total).toBeGreaterThanOrEqual(5);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 90_000 }
);

test.skipIf(!hasToken)(
  "ORDER BY captured_at DESC",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const oldest = DateTime.makeUnsafe("2026-05-01T12:00:00Z");
      const middle = DateTime.makeUnsafe("2026-05-15T12:00:00Z");
      const newest = DateTime.makeUnsafe("2026-05-30T12:00:00Z");
      const idOldest = randomUUID();
      const idMiddle = randomUUID();
      const idNewest = randomUUID();

      yield* client.UploadMediaRequest(makeUploadPayload({ id: idMiddle, capturedAt: middle })).pipe(retryReadyN(5));
      yield* client.UploadMediaRequest(makeUploadPayload({ id: idNewest, capturedAt: newest })).pipe(retryReadyN(5));
      yield* client.UploadMediaRequest(makeUploadPayload({ id: idOldest, capturedAt: oldest })).pipe(retryReadyN(5));

      const result = yield* client
        .SearchMediaRequest({
          ownerUserId: TEST_OWNER_ID,
          dateFrom: DateTime.makeUnsafe("2026-05-01T00:00:00Z"),
          dateTo: DateTime.makeUnsafe("2026-05-31T23:59:59Z"),
          limit: 100,
          offset: 0
        })
        .pipe(retryReadyN(5));

      const dates = result.results.map((r) => DateTime.toEpochMillis(r.capturedAt));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]!);
      }
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);
