import { RuntimeContext } from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { DateTime, Effect, Layer, Schema } from "effect";
import {
  MediaMetadataRepository,
  MediaMetadataRepositoryError
} from "../../domain/repository/media-metadata.repository.js";
import { MediaMetadata, ExifMetadata } from "../../domain/model/media.js";
import { MediaDb } from "../../resources/db.js";

const MediaTypeLiteral = Schema.Literals(["photo", "video", "live_photo"] as const);

const D1MediaRow = Schema.Struct({
  id: Schema.String,
  sha256_hash: Schema.String,
  type: MediaTypeLiteral,
  device_id: Schema.String,
  s3_key_full: Schema.String,
  s3_key_thumb: Schema.optional(Schema.String),
  owner_user_id: Schema.String,
  original_file_name: Schema.String,
  captured_at: Schema.String,
  uploaded_at: Schema.String,
  smb_path: Schema.String,
  file_size: Schema.Number,
  file_mtime: Schema.String,
  exif: Schema.optional(Schema.String)
});

const parseRowSync = (record: Record<string, unknown>): MediaMetadata => {
  const row = Schema.decodeUnknownSync(D1MediaRow)(record);
  return new MediaMetadata({
    id: row.id,
    originalFileName: row.original_file_name,
    sha256Hash: row.sha256_hash,
    type: row.type,
    deviceId: row.device_id,
    s3KeyFull: row.s3_key_full,
    s3KeyThumb: row.s3_key_thumb,
    ownerUserId: row.owner_user_id,
    uploadedAt: DateTime.makeUnsafe(row.uploaded_at),
    capturedAt: DateTime.makeUnsafe(row.captured_at),
    smbPath: row.smb_path,
    fileSize: row.file_size,
    fileMtime: row.file_mtime,
    exif: row.exif !== undefined ? Schema.decodeUnknownSync(ExifMetadata)(JSON.parse(row.exif)) : undefined
  });
};

const parseRow = (row: Record<string, unknown> | null): Effect.Effect<MediaMetadata, MediaMetadataRepositoryError> => {
  if (row === null) {
    return Effect.fail(
      new MediaMetadataRepositoryError({
        message: "Record not found",
        reason: "RecordNotFound"
      })
    );
  }

  return Effect.succeed(parseRowSync(row));
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
             (id, sha256_hash, type, device_id, s3_key_full, s3_key_thumb, owner_user_id, original_file_name, captured_at, uploaded_at, smb_path, file_size, file_mtime, exif)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            metadata.id,
            metadata.sha256Hash,
            metadata.type,
            metadata.deviceId,
            metadata.s3KeyFull,
            metadata.s3KeyThumb ?? null,
            metadata.ownerUserId,
            metadata.originalFileName,
            DateTime.formatIso(metadata.capturedAt),
            DateTime.formatIso(metadata.uploadedAt),
            metadata.smbPath,
            metadata.fileSize,
            metadata.fileMtime,
            metadata.exif !== undefined ? JSON.stringify(Schema.encodeSync(ExifMetadata)(metadata.exif)) : null
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
          .pipe(Effect.flatMap(parseRow), Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx)),

      searchMedia: (criteria) =>
        Effect.gen(function* () {
          const where: string[] = [];
          const params: unknown[] = [];

          where.push("owner_user_id = ?");
          params.push(criteria.ownerUserId);

          if (criteria.dateFrom !== undefined) {
            where.push("captured_at >= ?");
            params.push(DateTime.formatIso(criteria.dateFrom));
          }
          if (criteria.dateTo !== undefined) {
            where.push("captured_at <= ?");
            params.push(DateTime.formatIso(criteria.dateTo));
          }
          if (criteria.cameraMake !== undefined) {
            where.push("camera_make = ?");
            params.push(criteria.cameraMake);
          }
          if (criteria.cameraModel !== undefined) {
            where.push("camera_model = ?");
            params.push(criteria.cameraModel);
          }
          if (criteria.gpsLatMin !== undefined) {
            where.push("gps_lat >= ?");
            params.push(criteria.gpsLatMin);
          }
          if (criteria.gpsLatMax !== undefined) {
            where.push("gps_lat <= ?");
            params.push(criteria.gpsLatMax);
          }
          if (criteria.gpsLonMin !== undefined) {
            where.push("gps_lon >= ?");
            params.push(criteria.gpsLonMin);
          }
          if (criteria.gpsLonMax !== undefined) {
            where.push("gps_lon <= ?");
            params.push(criteria.gpsLonMax);
          }

          const whereClause = where.join(" AND ");

          const totalRow = yield* db
            .prepare(`SELECT COUNT(*) as c FROM media_metadata WHERE ${whereClause}`)
            .bind(...params)
            .first<{ c: number }>()
            .pipe(Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx));

          const total: number = totalRow?.c ?? 0;

          const rows = yield* db
            .prepare(`SELECT * FROM media_metadata WHERE ${whereClause} ORDER BY captured_at DESC LIMIT ? OFFSET ?`)
            .bind(...params, criteria.limit, criteria.offset)
            .all<Record<string, unknown>>()
            .pipe(Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx));

          const results = rows.results.map(parseRowSync);

          return { results, total };
        }).pipe(Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx)),

      findExistingSmbPaths: (tuples) =>
        Effect.gen(function* () {
          const results: string[] = [];
          const inputLookup = new Map<string, { fileSize: number; fileMtime: string }>();
          for (const t of tuples) {
            inputLookup.set(t.smbPath, { fileSize: t.fileSize, fileMtime: t.fileMtime });
          }

          const smbPaths = tuples.map((t) => t.smbPath);

          for (let i = 0; i < smbPaths.length; i += 500) {
            const chunk = smbPaths.slice(i, i + 500);
            const placeholders = chunk.map(() => "?").join(",");

            const rows = yield* db
              .prepare(`SELECT smb_path, file_size, file_mtime FROM media_metadata WHERE smb_path IN (${placeholders})`)
              .bind(...chunk)
              .all<{ smb_path: string; file_size: number; file_mtime: string }>()
              .pipe(Effect.mapError(mapD1Error), Effect.provideService(RuntimeContext, ctx));

            for (const row of rows.results) {
              const input = inputLookup.get(row.smb_path);
              if (input !== undefined && input.fileSize === row.file_size && input.fileMtime === row.file_mtime) {
                results.push(row.smb_path);
              }
            }
          }

          return results;
        })
    });
  })
);
