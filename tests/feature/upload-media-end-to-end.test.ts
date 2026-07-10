import { Cause, DateTime, Effect, Exit, Layer, Option } from "effect";
import { describe, it, expect } from "@effect/vitest";
import { uploadMediaHandler } from "../../src/http/rpc-handler/upload-media.handler.js";
import {
  MediaMetadataRepository,
  MediaMetadataRepositoryError
} from "../../src/domain/repository/media-metadata.repository.js";
import { MediaContentsRepository } from "../../src/domain/repository/media-contents.repository.js";
import { UPLOAD_MEDIA_ERROR_CODE } from "../../src/http/request/upload-media.request.js";
import type { MediaMetadata } from "../../src/domain/model/media.js";

describe("UploadMediaRequest", () => {
  it("should upload metadata and reject duplicate", () =>
    Effect.gen(function* () {
      const id = crypto.randomUUID();
      const stored: Record<string, MediaMetadata> = {};

      const repo = Layer.mergeAll(
        Layer.succeed(
          MediaMetadataRepository,
          MediaMetadataRepository.of({
            create: (metadata: MediaMetadata) =>
              Effect.sync(() => {
                stored[metadata.id] = metadata;
              }),
            findById: (_ownerId, mediaId) => {
              const found = stored[mediaId];
              return found !== undefined
                ? Effect.succeed(found)
                : Effect.fail(new MediaMetadataRepositoryError({ message: "not found", reason: "RecordNotFound" }));
            },
            findByHash: () =>
              Effect.fail(new MediaMetadataRepositoryError({ message: "not found", reason: "RecordNotFound" })),
            findExistingSmbPaths: () => Effect.succeed([]),
            searchMedia: () => Effect.succeed({ results: [], total: 0 })
          })
        ),
        Layer.succeed(
          MediaContentsRepository,
          MediaContentsRepository.of({
            isFileExist: () => Effect.succeed(false),
            generatePresignedUrlForUpload: (_contentType, _filePath) =>
              Effect.succeed("https://r2.example.com/presigned-url")
          })
        )
      );

      yield* uploadMediaHandler({
        sha256Hash: "e2e-tests-hash",
        originalFileName: "test.txt",
        type: "video",
        deviceId: "device-002",
        s3KeyFull: "/uploads/test.txt",
        s3KeyThumb: undefined,
        capturedAt: DateTime.nowUnsafe(),
        id,
        smbPath: "/smb/photos/test.txt",
        fileSize: 512,
        fileMtime: "2024-01-15T10:30:00Z"
      }).pipe(Effect.provide(repo));

      const failure = yield* uploadMediaHandler({
        sha256Hash: "e2e-tests-hash",
        originalFileName: "test.txt",
        type: "video",
        deviceId: "device-002",
        s3KeyFull: "/uploads/test.txt",
        s3KeyThumb: undefined,
        capturedAt: DateTime.nowUnsafe(),
        id,
        smbPath: "/smb/photos/test.txt",
        fileSize: 512,
        fileMtime: "2024-01-15T10:30:00Z"
      }).pipe(Effect.provide(repo), Effect.exit);

      expect(Exit.isFailure(failure)).toBe(true);

      if (Exit.isFailure(failure)) {
        const error = Option.getOrThrow(Cause.findErrorOption(failure.cause));
        expect(error._tag).toBe("UploadMediaError");
        if (error._tag === "UploadMediaError") {
          expect(error.errorCode).toBe(UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS);
        }
      }
    }).pipe(Effect.timeout("5 seconds")));
});
