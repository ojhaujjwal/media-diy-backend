import { Effect, Layer } from "effect";
import { describe, it, expect } from "@effect/vitest";
import { uploadMediaHandler } from "../../src/http/rpc-handler/upload-media.handler.js";
import {
  MediaMetadataRepository,
  MediaMetadataRepositoryError
} from "../../src/domain/repository/media-metadata.repository.js";
import { UPLOAD_MEDIA_ERROR_CODE } from "../../src/http/request/upload-media.request.js";
import { MediaMetadata } from "../../src/domain/model/media.js";

const mockRepoLayer = (
  findById: (ownerId: string, mediaId: string) => Effect.Effect<MediaMetadata, MediaMetadataRepositoryError>
): Layer.Layer<MediaMetadataRepository> =>
  Layer.succeed(
    MediaMetadataRepository,
    MediaMetadataRepository.of({
      create: () => Effect.void,
      findById,
      findByHash: () =>
        Effect.fail(
          new MediaMetadataRepositoryError({
            message: "not found",
            reason: "RecordNotFound"
          })
        )
    })
  );

describe("UploadMediaRequest", () => {
  it.effect("should succeed when media does not already exist", () =>
    Effect.gen(function* () {
      const repo = mockRepoLayer((_ownerId, _mediaId) =>
        Effect.fail(
          new MediaMetadataRepositoryError({
            message: "not found",
            reason: "RecordNotFound"
          })
        )
      );

      yield* uploadMediaHandler({
        sha256Hash: "tests-hash",
        originalFileName: "new-photo.jpg",
        type: "photo",
        deviceId: "device-001",
        filePath: "/uploads/new-photo.jpg",
        capturedAt: new Date(),
        id: crypto.randomUUID()
      }).pipe(Effect.provide(repo));
    })
  );

  it.effect("should fail with MEDIA_ALREADY_EXISTS when media already recorded", () =>
    Effect.gen(function* () {
      const id = crypto.randomUUID();

      const repo = mockRepoLayer((_ownerId, mediaId) =>
        mediaId === id
          ? Effect.succeed(
              new MediaMetadata({
                id,
                originalFileName: "existing.jpg",
                sha256Hash: "tests-hash",
                type: "photo",
                deviceId: "device-001",
                filePath: "/uploads/existing.jpg",
                ownerUserId: "a208ada0-8862-4ede-b45d-8ec34742bbbd",
                uploadedAt: new Date(),
                capturedAt: new Date()
              })
            )
          : Effect.fail(
              new MediaMetadataRepositoryError({
                message: "not found",
                reason: "RecordNotFound"
              })
            )
      );

      const result = yield* uploadMediaHandler({
        sha256Hash: "tests-hash",
        originalFileName: "existing.jpg",
        type: "photo",
        deviceId: "device-001",
        filePath: "/uploads/existing.jpg",
        capturedAt: new Date(),
        id
      }).pipe(Effect.provide(repo), Effect.result);

      expect(result._tag).toBe("Failure");

      if (result._tag === "Failure") {
        const error = result.failure;
        if (error._tag === "UploadMediaError") {
          expect(error.errorCode).toBe(UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS);
        }
      }
    }).pipe(Effect.timeout("5 seconds"))
  );
});
