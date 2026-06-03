import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import { UploadMediaRequest } from "../request/upload-media.request.js";
import { GenerateUploadPresignedUrlequest } from "../request/generate-upload-presigned-url.request.js";
import { FindMediaByIdRequest } from "../request/find-media-by-id.request.js";
import { FindMediaByHashRequest } from "../request/find-media-by-hash.request.js";

export const MediaRpcs = RpcGroup.make(
  Rpc.fromTaggedRequest(UploadMediaRequest),
  Rpc.fromTaggedRequest(GenerateUploadPresignedUrlequest),
  Rpc.fromTaggedRequest(FindMediaByIdRequest),
  Rpc.fromTaggedRequest(FindMediaByHashRequest)
);

export { UploadMediaRequest, GenerateUploadPresignedUrlequest, FindMediaByIdRequest, FindMediaByHashRequest };
