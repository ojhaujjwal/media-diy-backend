import { describe, expectTypeOf, it } from "vitest";
import type { DateTime } from "effect";
import type * as Rpc from "effect/unstable/rpc/Rpc";
import type { UploadMediaRequest, GenerateUploadPresignedUrlRequest } from "../src/http/rpc-handler/rpc-definitions.js";
import type { MediaType } from "../src/domain/model/media.js";

describe("UploadMediaRequest payload", () => {
  type PayloadConstructor = Rpc.PayloadConstructor<typeof UploadMediaRequest>;

  it("accepts valid payload", () => {
    expectTypeOf<{
      id: string;
      sha256Hash: string;
      originalFileName: string;
      type: MediaType;
      deviceId: string;
      s3KeyFull: string;
      smbPath: string;
      fileSize: number;
      fileMtime: string;
      capturedAt: DateTime.Utc;
    }>().toMatchTypeOf<PayloadConstructor>();
  });

  it("rejects bogus mediaType", () => {
    expectTypeOf<{ type: "bogus-type" }>().not.toMatchTypeOf<PayloadConstructor>();
  });
});

describe("GenerateUploadPresignedUrlRequest payload", () => {
  type PayloadConstructor = Rpc.PayloadConstructor<typeof GenerateUploadPresignedUrlRequest>;

  it("accepts valid fileExtension", () => {
    expectTypeOf<{ mediaType: MediaType; fileExtension: "jpg" }>().toMatchTypeOf<PayloadConstructor>();
  });

  it("rejects invalid fileExtension", () => {
    expectTypeOf<{ fileExtension: "exe" }>().not.toMatchTypeOf<PayloadConstructor>();
  });
});
