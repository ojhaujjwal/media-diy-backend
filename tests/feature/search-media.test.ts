import { DateTime, Effect, Layer } from "effect";
import { describe, it, expect } from "@effect/vitest";
import { searchMediaHandler } from "../../src/http/rpc-handler/search-media.handler.js";
import {
  MediaMetadataRepository,
  MediaMetadataRepositoryError
} from "../../src/domain/repository/media-metadata.repository.js";
import { MediaMetadata } from "../../src/domain/model/media.js";

const makeMedia = (overrides: Partial<ConstructorParameters<typeof MediaMetadata>[0]> = {}) =>
  new MediaMetadata({
    id: crypto.randomUUID(),
    originalFileName: "photo.jpg",
    sha256Hash: "abc123",
    type: "photo",
    deviceId: "device-001",
    s3KeyFull: "full/photo.jpg",
    ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
    uploadedAt: DateTime.makeUnsafe("2024-01-15T10:00:00Z"),
    capturedAt: DateTime.makeUnsafe("2024-01-15T10:00:00Z"),
    smbPath: "/smb/photo.jpg",
    fileSize: 1024,
    fileMtime: "2024-01-15T10:00:00Z",
    ...overrides
  });

const buildMockRepo = (
  searchMedia: (_criteria: {
    readonly ownerUserId: string;
    readonly dateFrom?: DateTime.Utc;
    readonly dateTo?: DateTime.Utc;
    readonly cameraMake?: string;
    readonly cameraModel?: string;
    readonly gpsLatMin?: number;
    readonly gpsLatMax?: number;
    readonly gpsLonMin?: number;
    readonly gpsLonMax?: number;
    readonly limit: number;
    readonly offset: number;
  }) => Effect.Effect<
    { readonly results: ReadonlyArray<MediaMetadata>; readonly total: number },
    MediaMetadataRepositoryError
  >
) =>
  Layer.succeed(
    MediaMetadataRepository,
    MediaMetadataRepository.of({
      create: () => Effect.void,
      findById: () => Effect.fail(new MediaMetadataRepositoryError({ message: "not found", reason: "RecordNotFound" })),
      findByHash: () =>
        Effect.fail(new MediaMetadataRepositoryError({ message: "not found", reason: "RecordNotFound" })),
      findExistingSmbPaths: () => Effect.succeed([]),
      searchMedia
    })
  );

describe("SearchMedia", () => {
  it.effect("returns results + total; handler maps summaries including cameraMake/cameraModel from exif", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo(() =>
        Effect.succeed({
          results: [
            makeMedia({
              exif: { width: 4000, height: 3000, make: "Apple", model: "iPhone 15" }
            })
          ],
          total: 1
        })
      );

      const result = yield* searchMediaHandler({
        ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
        limit: 50,
        offset: 0
      }).pipe(Effect.provide(repo));

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.results[0].cameraMake).toBe("Apple");
      expect(result.results[0].cameraModel).toBe("iPhone 15");
      expect(result.results[0].s3KeyFull).toBe("full/photo.jpg");
    })
  );

  it.effect("s3KeyThumb undefined when absent; present when provided", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo(() =>
        Effect.succeed({
          results: [makeMedia({ s3KeyThumb: undefined }), makeMedia({ s3KeyThumb: "thumb/photo.jpg" })],
          total: 2
        })
      );

      const result = yield* searchMediaHandler({
        ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
        limit: 50,
        offset: 0
      }).pipe(Effect.provide(repo));

      expect(result.results[0].s3KeyThumb).toBeUndefined();
      expect(result.results[1].s3KeyThumb).toBe("thumb/photo.jpg");
    })
  );

  it.effect("empty results => results: [], total: 0", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo(() => Effect.succeed({ results: [], total: 0 }));

      const result = yield* searchMediaHandler({
        ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
        limit: 50,
        offset: 0
      }).pipe(Effect.provide(repo));

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    })
  );

  it.effect("passes limit/offset through to repo", () =>
    Effect.gen(function* () {
      let captured: {
        limit: number;
        offset: number;
      } = { limit: 0, offset: 0 };
      const repo = buildMockRepo((criteria) => {
        captured = criteria;
        return Effect.succeed({ results: [], total: 0 });
      });

      yield* searchMediaHandler({
        ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
        limit: 10,
        offset: 20
      }).pipe(Effect.provide(repo));

      expect(captured.limit).toBe(10);
      expect(captured.offset).toBe(20);
    })
  );

  it.effect("no filters (ownerUserId only) still works", () =>
    Effect.gen(function* () {
      let capturedCriteria: {
        ownerUserId: string;
        dateFrom?: DateTime.Utc;
        cameraMake?: string;
      } = { ownerUserId: "" };
      const repo = buildMockRepo((criteria) => {
        capturedCriteria = criteria;
        return Effect.succeed({ results: [makeMedia()], total: 1 });
      });

      const result = yield* searchMediaHandler({
        ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
        limit: 50,
        offset: 0
      }).pipe(Effect.provide(repo));

      expect(result.total).toBe(1);
      expect(capturedCriteria.ownerUserId).toBe("a208ada0-8862-4ede-b45d-8ec34742bbbd");
      expect(capturedCriteria.dateFrom).toBeUndefined();
      expect(capturedCriteria.cameraMake).toBeUndefined();
    })
  );
});
