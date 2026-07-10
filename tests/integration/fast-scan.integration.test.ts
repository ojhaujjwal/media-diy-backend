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
    smbPath: string;
    fileSize: number;
    fileMtime: string;
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
    capturedAt: DateTime.makeUnsafe("2026-01-15T12:00:00Z"),
    smbPath: overrides.smbPath ?? `/share/${id}.jpg`,
    fileSize: overrides.fileSize ?? 1024,
    fileMtime: overrides.fileMtime ?? "1700000000",
    exif: {
      width: 1920,
      height: 1080
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
  "exact triple match (path+size+mtime)",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const smbPath = `/share/fastscan-${randomUUID()}.jpg`;
      const fileSize = 2048;
      const fileMtime = "1700000123";
      const id = randomUUID();

      yield* client.UploadMediaRequest(makeUploadPayload({ id, smbPath, fileSize, fileMtime })).pipe(retryReadyN(5));

      const result = yield* client
        .FindExistingMediaByFastScanRequest({
          tuples: [{ smbPath, fileSize, fileMtime }]
        })
        .pipe(retryReadyN(5));

      expect(result.existingSmbPaths).toHaveLength(1);
      expect(result.existingSmbPaths[0]).toBe(smbPath);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "no match for different size",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const smbPath = `/share/fastscan-${randomUUID()}.jpg`;
      const id = randomUUID();

      yield* client.UploadMediaRequest(makeUploadPayload({ id, smbPath, fileSize: 2048 })).pipe(retryReadyN(5));

      const result = yield* client
        .FindExistingMediaByFastScanRequest({
          tuples: [{ smbPath, fileSize: 4096, fileMtime: "1700000000" }]
        })
        .pipe(retryReadyN(5));

      expect(result.existingSmbPaths).toHaveLength(0);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);

test.skipIf(!hasToken)(
  "no match for different mtime",
  Effect.gen(function* () {
    const { url } = yield* stackOutputs;
    return yield* Effect.gen(function* () {
      const client = yield* RpcClient.make(MediaRpcs);
      const smbPath = `/share/fastscan-${randomUUID()}.jpg`;
      const id = randomUUID();

      yield* client
        .UploadMediaRequest(makeUploadPayload({ id, smbPath, fileMtime: "1700000000" }))
        .pipe(retryReadyN(5));

      const result = yield* client
        .FindExistingMediaByFastScanRequest({
          tuples: [{ smbPath, fileSize: 1024, fileMtime: "1700000999" }]
        })
        .pipe(retryReadyN(5));

      expect(result.existingSmbPaths).toHaveLength(0);
    }).pipe(Effect.scoped, Effect.provide(clientLayer(url)));
  }),
  { timeout: 60_000 }
);
