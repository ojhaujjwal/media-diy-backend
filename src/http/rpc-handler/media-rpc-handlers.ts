import { Effect } from "effect";
import { MediaRpcs } from "./rpc-definitions.js";
import { uploadMediaHandler } from "./upload-media.handler.js";
import { generateUploadPresignedUrlHandler } from "./generate-upload-presigned-url.handler.js";
import { findMediaByIdHandler } from "./find-media-by-id.handler.js";
import { findMediaByHashHandler } from "./find-media-by-hash.handler.js";

export const MediaRpcLive = MediaRpcs.toLayer(
  Effect.succeed({
    UploadMediaRequest: uploadMediaHandler,
    GenerateUploadPresignedUrlequest: generateUploadPresignedUrlHandler,
    FindMediaByIdRequest: findMediaByIdHandler,
    FindMediaByHashRequest: findMediaByHashHandler
  })
);
