import { RuntimeContext } from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect, Layer, Schema } from "effect";
import {
  MediaMetadataRepository,
  MediaMetadataRepositoryError
} from "../../domain/repository/media-metadata.repository.js";
import { MediaMetadata } from "../../domain/model/media.js";
import { MediaDb } from "../../resources/db.js";

const MediaTypeLiteral = Schema.Literals(["photo", "video", "live_photo"] as const);

const D1MediaRow = Schema.Struct({
  id: Schema.String,
  sha256_hash: Schema.String,
  type: MediaTypeLiteral,
  device_id: Schema.String,
  file_path: Schema.String,
  owner_user_id: Schema.String,
  original_file_name: Schema.String,
  captured_at: Schema.String,
  uploaded_at: Schema.String
});

const parseRow = (row: Record<string, unknown> | null): Effect.Effect<MediaMetadata, MediaMetadataRepositoryError> => {
  if (!row) {
    return Effect.fail(
      new MediaMetadataRepositoryError({
        message: "Record not found",
        reason: "RecordNotFound"
      })
    );
  }

  const record = Schema.decodeUnknownSync(D1MediaRow)(row);

  return Effect.succeed(
    new MediaMetadata({
      id: record.id,
      originalFileName: record.original_file_name,
      sha256Hash: record.sha256_hash,
      type: record.type,
      deviceId: record.device_id,
      filePath: record.file_path,
      ownerUserId: record.owner_user_id,
      uploadedAt: new Date(record.uploaded_at),
      capturedAt: new Date(record.captured_at)
    })
  );
};

const mapD1Error = (e: unknown) =>
  new MediaMetadataRepositoryError({
    message: e instanceof Error ? e.message : "Unknown D1 error",
    reason: "UnknownError",
    previous: e instanceof Error ? e : undefined
  });

export const MediaMetadataD1Live = Layer.effect(
  MediaMetadataRepository,
  Effect.gen(function* () {
    const ctx = yield* RuntimeContext;
    const db = yield* Cloudflare.D1Connection.bind(MediaDb);

    return MediaMetadataRepository.of({
      create: (metadata) =>
        db
          .prepare(
            `INSERT INTO media_metadata
             (id, sha256_hash, type, device_id, file_path, owner_user_id, original_file_name, captured_at, uploaded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            metadata.id,
            metadata.sha256Hash,
            metadata.type,
            metadata.deviceId,
            metadata.filePath,
            metadata.ownerUserId,
            metadata.originalFileName,
            metadata.capturedAt.toISOString(),
            metadata.uploadedAt.toISOString()
          )
          .run()
          .pipe(Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx)),

      findById: (ownerUserId, mediaId) =>
        db
          .prepare("SELECT * FROM media_metadata WHERE owner_user_id = ? AND id = ?")
          .bind(ownerUserId, mediaId)
          .first<Record<string, unknown>>()
          .pipe(Effect.flatMap(parseRow), Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx)),

      findByHash: (sha256Hash) =>
        db
          .prepare("SELECT * FROM media_metadata WHERE sha256_hash = ?")
          .bind(sha256Hash)
          .first<Record<string, unknown>>()
          .pipe(Effect.flatMap(parseRow), Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx))
    });
  })
);
