import { Effect, Layer } from "effect";
import { describe, it, expect } from "@effect/vitest";
import { findExistingMediaByFastScanHandler } from "../../src/http/rpc-handler/find-existing-media-by-fast-scan.handler.js";
import {
  MediaMetadataRepository,
  MediaMetadataRepositoryError
} from "../../src/domain/repository/media-metadata.repository.js";

const buildMockRepo = (
  findExistingSmbPaths: (
    tuples: ReadonlyArray<{ readonly smbPath: string; readonly fileSize: number; readonly fileMtime: string }>
  ) => Effect.Effect<ReadonlyArray<string>, MediaMetadataRepositoryError>
) =>
  Layer.succeed(
    MediaMetadataRepository,
    MediaMetadataRepository.of({
      create: () => Effect.void,
      findById: () => Effect.fail(new MediaMetadataRepositoryError({ message: "not found", reason: "RecordNotFound" })),
      findByHash: () =>
        Effect.fail(new MediaMetadataRepositoryError({ message: "not found", reason: "RecordNotFound" })),
      findExistingSmbPaths,
      searchMedia: () => Effect.succeed({ results: [], total: 0 })
    })
  );

describe("FindExistingMediaByFastScan", () => {
  it.effect("should return tuples that fully match", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo((tuples) =>
        Effect.succeed(
          tuples
            .filter(
              (t) => t.smbPath === "/smb/photo.jpg" && t.fileSize === 100 && t.fileMtime === "2024-01-15T10:00:00Z"
            )
            .map((t) => t.smbPath)
        )
      );

      const result = yield* findExistingMediaByFastScanHandler({
        tuples: [
          { smbPath: "/smb/photo.jpg", fileSize: 100, fileMtime: "2024-01-15T10:00:00Z" },
          { smbPath: "/smb/other.jpg", fileSize: 200, fileMtime: "2024-01-15T11:00:00Z" }
        ]
      }).pipe(Effect.provide(repo));

      expect(result.existingSmbPaths).toEqual(["/smb/photo.jpg"]);
    })
  );

  it.effect("should not return tuples where size differs", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo((tuples) =>
        Effect.succeed(
          tuples
            .filter(
              (t) => t.smbPath === "/smb/photo.jpg" && t.fileSize === 100 && t.fileMtime === "2024-01-15T10:00:00Z"
            )
            .map((t) => t.smbPath)
        )
      );

      const result = yield* findExistingMediaByFastScanHandler({
        tuples: [{ smbPath: "/smb/photo.jpg", fileSize: 999, fileMtime: "2024-01-15T10:00:00Z" }]
      }).pipe(Effect.provide(repo));

      expect(result.existingSmbPaths).toEqual([]);
    })
  );

  it.effect("should not return tuples where mtime differs", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo((tuples) =>
        Effect.succeed(
          tuples
            .filter(
              (t) => t.smbPath === "/smb/photo.jpg" && t.fileSize === 100 && t.fileMtime === "2024-01-15T10:00:00Z"
            )
            .map((t) => t.smbPath)
        )
      );

      const result = yield* findExistingMediaByFastScanHandler({
        tuples: [{ smbPath: "/smb/photo.jpg", fileSize: 100, fileMtime: "2024-01-15T99:99:99Z" }]
      }).pipe(Effect.provide(repo));

      expect(result.existingSmbPaths).toEqual([]);
    })
  );

  it.effect("should not return unknown smb_path", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo(() => Effect.succeed([]));

      const result = yield* findExistingMediaByFastScanHandler({
        tuples: [{ smbPath: "/smb/unknown.jpg", fileSize: 100, fileMtime: "2024-01-15T10:00:00Z" }]
      }).pipe(Effect.provide(repo));

      expect(result.existingSmbPaths).toEqual([]);
    })
  );

  it.effect("should return empty array when no tuples provided", () =>
    Effect.gen(function* () {
      const repo = buildMockRepo(() => Effect.succeed([]));

      const result = yield* findExistingMediaByFastScanHandler({
        tuples: []
      }).pipe(Effect.provide(repo));

      expect(result.existingSmbPaths).toEqual([]);
    })
  );
});
