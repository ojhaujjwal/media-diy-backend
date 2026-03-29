import { Effect } from "effect";
import { MediaRpcs } from "./rpc-definitions";
import { uploadMediaHandler } from "./upload-media.handler";
import { generateUploadPresignedUrlHandler } from "./generate-upload-presigned-url.handler";
import { findMediaByIdHandler } from "./find-media-by-id.handler";

export const MediaRpcLive = MediaRpcs.toLayer(
  Effect.succeed({
    UploadMediaRequest: uploadMediaHandler,
    GenerateUploadPresignedUrlequest: generateUploadPresignedUrlHandler,
    FindMediaByIdRequest: findMediaByIdHandler,
  }),
);
