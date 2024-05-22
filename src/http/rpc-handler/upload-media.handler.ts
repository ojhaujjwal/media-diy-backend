import { Rpc } from "@effect/rpc";
import { Effect, Layer } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";
import { UPLOAD_MEDIA_ERROR_CODE, UploadMediaError, UploadMediaRequest } from "http/request/upload-media.request";
import { MediaMetadataRepository } from "domain/repository/media-metadata.repository";
import { randomUUID } from "crypto";

export const uploadMediaRouteHandler = Rpc.effect<UploadMediaRequest, MediaContentsRepository | MediaMetadataRepository>(UploadMediaRequest, (request: UploadMediaRequest) => 
  Effect.gen(function* () {
    const mediaContentsRepository = yield* MediaContentsRepository;

    const isFileExist = yield* mediaContentsRepository.isFileExist(request.filePath)
  
    if (!isFileExist) {
      yield* Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_NOT_FOUND }));
    }
  
    const mediaMetadataRepository = yield* MediaMetadataRepository;

    //TODO: check if media already exists with the uuid
  
    yield* mediaMetadataRepository.create({
      originalFileName: request.originalFileName,
      deviceId: request.deviceId,
      filePath: request.filePath,
      md5Hash: request.md5Hash, // todo: check md5 hash
      type: request.type,
      capturedAt: request.capturedAt,
      uploadedAt: new Date(),
      id: request.id,

      ownerUserId: randomUUID(), // TODO: infer the user id from the authentication context
    });
  })
    .pipe(
      //TODO log errors
      Effect.catchTags({
        MediaMetadataRepositoryError: () => Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.SERVER_ERROR })),
        MediaContentsRepositoryError:  () => Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.SERVER_ERROR })),
      }),
      Effect.catchAllDefect((e) => {
        console.error('error', e);
        return Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.SERVER_ERROR }))
      }),
    )
);
