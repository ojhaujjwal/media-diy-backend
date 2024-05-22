import { Schema as S } from "@effect/schema";

export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
  LIVE_PHOTO = 'live_photo',
};

export const MediaFileExtensionSchema = S.Literal('heic', 'heif', 'jpg', 'jpeg', 'png', 'mp4', 'mov');
export type MediaFileExtension = S.Schema.Type<typeof MediaFileExtensionSchema>;

export const FILE_EXTENSION_MAPPING: Record<MediaType, ReadonlyArray<MediaFileExtension>> = {
  [MediaType.PHOTO]: ['heic', 'heif', 'jpg', 'jpeg', 'png'],
  [MediaType.LIVE_PHOTO]: ['heic', 'heif'],
  [MediaType.VIDEO]: ['mp4', 'mov', 'heif'],
} as const;

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
  
  exif: S.optional(S.Struct({
    width: S.Number,
    height: S.Number,
    make: S.String,
    model: S.String,
    exposureTime: S.String,
    aperture: S.String,
    focalLength: S.String,
    iso: S.Number,
    orientation: S.Number,
    flash: S.Number,
    whiteBalance: S.Number,
    meteringMode: S.Number,
    exposureMode: S.Number,
    exposureProgram: S.Number,
    exposureBias: S.Number,
    software: S.String,
    gps: S.Struct({
      latitude: S.Number,
      longitude: S.Number,
      altitude: S.Number,
      timestamp: S.Date,
    }),
  })),
}) {}
