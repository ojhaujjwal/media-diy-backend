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
