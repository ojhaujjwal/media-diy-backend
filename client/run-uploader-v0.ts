import * as Http from "@effect/platform/HttpClient";
import { Resolver } from "@effect/rpc";
import { HttpResolver } from "@effect/rpc-http";
import type { ClientRouter } from "../src/http/app-server-factory";
import { getFiles } from "./get-files-v0";
import { Effect, Either, Stream } from "effect";
import { stream } from "@effect/platform/Http/Body";
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { GenerateUploadPresignedUrlequest, MediaType } from "../src/http/request/generate-upload-presigned-url.request";
import { FileSystem } from "@effect/platform";
import { pipe } from "effect";
import { UploadMediaRequest } from "../src/http/request/upload-media.request";
import { randomUUID } from "crypto";
import hash from 'hasha';

const filePath = process.argv[2];
const deviceId = process.argv[3] || "ujjwal";

const rpcClientResolver = HttpResolver.make<ClientRouter>(
  Http.client.fetchOk.pipe(
    Http.client.mapRequest(
      Http.request.prependUrl("http://localhost:3000/rpc"),
    ),
  ),
);

const rpcClient = Resolver.toClient(rpcClientResolver);

const filesStream = Stream.fromAsyncIterable(getFiles(filePath), (e) => e);

const program = filesStream.pipe(
  Stream.runForEach((imagePath) => Effect.gen(function* () {
    const { presignedUrl, filePath: remoteFilePath } = yield* rpcClient(
      new GenerateUploadPresignedUrlequest({
        mediaType: MediaType.PHOTO,
        fileExtension: "jpeg",
      }),
    );

    console.log('presignedUrl', presignedUrl);

    // const client = yield* Http.client.Client;
    // const fs = yield* FileSystem.FileSystem;
    // const { size: imageSizeInBytes } = yield* fs.stat(imagePath);

    // yield* pipe(
    //   Http.request.put(presignedUrl, {
    //     body: stream(fs.stream(imagePath)),
    //     headers: { "Content-Length": imageSizeInBytes.toString() },
    //   }),
    //   client,
    //   Effect.scoped,
    // );

    // const imageHash = yield* Effect.tryPromise(
    //   () => hash.fromFile(imagePath, { algorithm: 'md5' })
    // );

    // console.log('remoteFilePath', remoteFilePath);

    // yield* rpcClient(
    //   new UploadMediaRequest({
    //     md5Hash: imageHash,
    //     deviceId: deviceId,
    //     originalFileName: imagePath.split('/').pop() as string,
    //     type: MediaType.PHOTO,
    //     filePath: remoteFilePath,
    //     capturedAt: new Date(), // todo: get it from exif
    //     id: randomUUID(),
    //   }),
    // );
  })),
  
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Http.client.layer),
);

NodeRuntime.runMain(program);
