import { Schema as S } from "effect";

export const MediaType = {
  PHOTO: "photo",
  VIDEO: "video",
  LIVE_PHOTO: "live_photo"
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export const MediaFileExtensionSchema = S.Literals(["heic", "heif", "jpg", "jpeg", "png", "mp4", "mov"]);
export type MediaFileExtension = S.Schema.Type<typeof MediaFileExtensionSchema>;

export const FILE_EXTENSION_MAPPING: Record<MediaType, readonly MediaFileExtension[]> = {
  [MediaType.PHOTO]: ["heic", "heif", "jpg", "jpeg", "png"],
  [MediaType.LIVE_PHOTO]: ["heic", "heif"],
  [MediaType.VIDEO]: ["mp4", "mov", "heif"]
} as const;

export const ExifMetadata = S.Struct({
  width: S.Number,
  height: S.Number,
  make: S.optional(S.String),
  model: S.optional(S.String),
  exposureTime: S.optional(S.String),
  aperture: S.optional(S.String),
  focalLength: S.optional(S.String),
  iso: S.optional(S.Number),
  orientation: S.optional(S.Number),
  flash: S.optional(S.Number),
  whiteBalance: S.optional(S.Number),
  meteringMode: S.optional(S.Number),
  exposureMode: S.optional(S.Number),
  exposureProgram: S.optional(S.Number),
  exposureBias: S.optional(S.Number),
  software: S.optional(S.String),
  gps: S.optional(
    S.Struct({
      latitude: S.optional(S.Number),
      longitude: S.optional(S.Number),
      altitude: S.optional(S.Number),
      timestamp: S.optional(S.DateTimeUtcFromString)
    })
  )
});

export class MediaMetadata extends S.Class<MediaMetadata>("MediaMetadata")({
  id: S.String.check(S.isUUID()),
  originalFileName: S.String,
  sha256Hash: S.String,
  type: S.Enum(MediaType),
  deviceId: S.String,
  s3KeyFull: S.String,
  s3KeyThumb: S.optional(S.String),
  ownerUserId: S.String,
  uploadedAt: S.DateTimeUtc,
  capturedAt: S.DateTimeUtc,
  smbPath: S.String,
  fileSize: S.Number,
  fileMtime: S.String,
  exif: S.optional(ExifMetadata)
}) {}
