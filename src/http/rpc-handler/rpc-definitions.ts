import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import { UploadMediaRequest } from "../request/upload-media.request";
import { GenerateUploadPresignedUrlequest } from "../request/generate-upload-presigned-url.request";
import { FindMediaByIdRequest } from "../request/find-media-by-id.request";

export const MediaRpcs = RpcGroup.make(
  Rpc.fromTaggedRequest(UploadMediaRequest),
  Rpc.fromTaggedRequest(GenerateUploadPresignedUrlequest),
  Rpc.fromTaggedRequest(FindMediaByIdRequest),
);

export {
  UploadMediaRequest,
  GenerateUploadPresignedUrlequest,
  FindMediaByIdRequest,
};
