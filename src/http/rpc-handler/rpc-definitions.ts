import { Schema as S } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { MediaType, MediaFileExtensionSchema, ExifMetadata } from "../../domain/model/media.js";
import { UploadMediaError } from "../request/upload-media.request.js";
import { FindMediaByIdError, FindMediaResponse } from "../request/find-media-by-id.request.js";
import { FindMediaByHashError, FindMediaByHashResponse } from "../request/find-media-by-hash.request.js";
import {
  GenerateUploadPresignedUrlError,
  PresignedUrlResponse
} from "../request/generate-upload-presigned-url.request.js";
import { FastScanError, FastScanResponse } from "../request/find-existing-media-by-fast-scan.request.js";
import { SearchMediaError, SearchMediaResponse } from "../request/search-media.request.js";

export const UploadMediaRequest = Rpc.make("UploadMediaRequest", {
  payload: {
    sha256Hash: S.String,
    originalFileName: S.String,
    type: S.Enum(MediaType),
    deviceId: S.String,
    s3KeyFull: S.String,
    s3KeyThumb: S.optional(S.String),
    capturedAt: S.DateTimeUtc,
    id: S.String.check(S.isUUID()),
    smbPath: S.String,
    fileSize: S.Number,
    fileMtime: S.String,
    exif: S.optional(ExifMetadata)
  },
  success: S.Void,
  error: UploadMediaError
});

export const GenerateUploadPresignedUrlRequest = Rpc.make("GenerateUploadPresignedUrlRequest", {
  payload: {
    mediaType: S.Enum(MediaType),
    fileExtension: MediaFileExtensionSchema
  },
  success: PresignedUrlResponse,
  error: GenerateUploadPresignedUrlError
});

export const FindMediaByIdRequest = Rpc.make("FindMediaByIdRequest", {
  payload: {
    ownerUserId: S.String.check(S.isUUID()),
    id: S.String.check(S.isUUID())
  },
  success: FindMediaResponse,
  error: FindMediaByIdError
});

export const FindMediaByHashRequest = Rpc.make("FindMediaByHashRequest", {
  payload: {
    sha256Hash: S.String
  },
  success: FindMediaByHashResponse,
  error: FindMediaByHashError
});

export const FindExistingMediaByFastScanRequest = Rpc.make("FindExistingMediaByFastScanRequest", {
  payload: {
    tuples: S.Array(
      S.Struct({
        smbPath: S.String,
        fileSize: S.Number,
        fileMtime: S.String
      })
    )
  },
  success: FastScanResponse,
  error: FastScanError
});

export const SearchMediaRequest = Rpc.make("SearchMediaRequest", {
  payload: {
    ownerUserId: S.String.check(S.isUUID()),
    dateFrom: S.optional(S.DateTimeUtc),
    dateTo: S.optional(S.DateTimeUtc),
    cameraMake: S.optional(S.String),
    cameraModel: S.optional(S.String),
    gpsLatMin: S.optional(S.Number),
    gpsLatMax: S.optional(S.Number),
    gpsLonMin: S.optional(S.Number),
    gpsLonMax: S.optional(S.Number),
    limit: S.Number,
    offset: S.Number
  },
  success: SearchMediaResponse,
  error: SearchMediaError
});

export const MediaRpcs = RpcGroup.make(
  UploadMediaRequest,
  GenerateUploadPresignedUrlRequest,
  FindMediaByIdRequest,
  FindMediaByHashRequest,
  FindExistingMediaByFastScanRequest,
  SearchMediaRequest
);
