import { Schema as S } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { MediaType } from "../../domain/model/media.js";
import { MediaFileExtensionSchema } from "../../domain/model/media.js";
import { UploadMediaError } from "../request/upload-media.request.js";
import { FindMediaByIdError, FindMediaResponse } from "../request/find-media-by-id.request.js";
import { FindMediaByHashError, FindMediaByHashResponse } from "../request/find-media-by-hash.request.js";
import {
  GenerateUploadPresignedUrlError,
  PresignedUrlResponse
} from "../request/generate-upload-presigned-url.request.js";

export const UploadMediaRequest = Rpc.make("UploadMediaRequest", {
  payload: {
    sha256Hash: S.String,
    originalFileName: S.String,
    type: S.Enum(MediaType),
    deviceId: S.String,
    filePath: S.String,
    capturedAt: S.Date,
    id: S.String.check(S.isUUID())
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

export const MediaRpcs = RpcGroup.make(
  UploadMediaRequest,
  GenerateUploadPresignedUrlRequest,
  FindMediaByIdRequest,
  FindMediaByHashRequest
);
