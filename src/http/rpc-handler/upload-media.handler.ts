import { Rpc } from "@effect/rpc";
import { Effect } from "effect";
import { MediaContentsRepository } from "../../domain/repository/media-contents.repository";
import { UPLOAD_MEDIA_ERROR_CODE, UploadMediaError, UploadMediaRequest } from "http/request/upload-media.request";


export const uploadMediaRouteHandler = Rpc.effect(UploadMediaRequest, (request: UploadMediaRequest) => {
  return MediaContentsRepository.pipe(
    Effect.flatMap((repo) => repo.isFileExist(request.filePath)),


    //TODO: validate file type

    Effect.flatMap((isFileExist) => isFileExist ? Effect.void : Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_NOT_FOUND }))),

    //TODO: save fil metadata in dynamo db

    Effect.catchTag("MediaContentsRepositoryError", (e) =>
      Effect.fail(new UploadMediaError({ errorCode: UPLOAD_MEDIA_ERROR_CODE.MEDIA_NOT_FOUND })
    )
  ))
})
