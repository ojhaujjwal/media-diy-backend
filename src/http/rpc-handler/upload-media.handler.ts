import { Rpc } from "@effect/rpc";
import { Effect, Layer } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";
import { UPLOAD_MEDIA_ERROR_CODE, UploadMediaError, UploadMediaRequest } from "http/request/upload-media.request";
import { MediaMetadataRepository } from "domain/repository/media-metadata.repository";
import { errorHandler } from "./helpers";

const routeErrorHandler = errorHandler({ failureResult: new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.SERVER_ERROR }) });

export const uploadMediaRouteHandler = Rpc.effect<UploadMediaRequest, MediaContentsRepository | MediaMetadataRepository>(UploadMediaRequest, (request: UploadMediaRequest) => 
  Effect.gen(function* () {
    const mediaContentsRepository = yield* MediaContentsRepository;

    const isFileExist = yield* mediaContentsRepository.isFileExist(request.filePath)
  
    if (!isFileExist) {
      yield* Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_NOT_FOUND }));
    }

    const ownerUserId = 'a208ada0-8862-4ede-b45d-8ec34742bbbd'; // TODO: infer the user id from the authentication context;
  
    const mediaMetadataRepository = yield* MediaMetadataRepository;

    yield* mediaMetadataRepository
      .findById(ownerUserId, request.id)
      .pipe(
        Effect.flatMap(() => Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_ALREADY_EXISTS }))),
        Effect.catchTag('MediaMetadataRepositoryError', () => Effect.void),
      )
  
    yield* mediaMetadataRepository.create({
      originalFileName: request.originalFileName,
      deviceId: request.deviceId,
      filePath: request.filePath,
      md5Hash: request.md5Hash, // todo: check md5 hash
      type: request.type,
      capturedAt: request.capturedAt,
      uploadedAt: new Date(),
      id: request.id,

      ownerUserId,
    });
  })
    .pipe(
      Effect.catchTags({
        MediaMetadataRepositoryError: routeErrorHandler,
        MediaContentsRepositoryError:  routeErrorHandler,
      }),
      Effect.catchAllDefect(routeErrorHandler),
    )
);
