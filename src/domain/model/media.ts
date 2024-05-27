import { Schema as S } from "@effect/schema";

export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
  LIVE_PHOTO = 'live_photo',
};

export const MediaFileExtensionSchema = S.Literal('heic', 'heif', 'jpg', 'jpeg', 'png', 'mp4', 'mov');
export type MediaFileExtension = S.Schema.Type<typeof MediaFileExtensionSchema>;

export const FILE_EXTENSION_MAPPING: Record<MediaType, readonly MediaFileExtension[]> = {
  [MediaType.PHOTO]: ['heic', 'heif', 'jpg', 'jpeg', 'png'],
  [MediaType.LIVE_PHOTO]: ['heic', 'heif'],
  [MediaType.VIDEO]: ['mp4', 'mov', 'heif'],
} as const;

export const ExifMetadata = S.Struct({
  width: S.Number,
  height: S.Number,
  make: S.String,
  model: S.String,
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
  gps: S.Struct({
    latitude: S.Number,
    longitude: S.Number,
    altitude: S.Number,
    timestamp: S.Date,
  }),
});

export class MediaMetadata extends S.Class<MediaMetadata>("MediaMetadata")({
  id: S.UUID,
  originalFileName: S.String,
  md5Hash: S.String,
  type: S.Enums(MediaType),
  deviceId: S.String,
  filePath: S.String,
  ownerUserId: S.String,
  uploadedAt: S.Date,
  capturedAt: S.Date,
  exif: S.optional(ExifMetadata),
}) {}
