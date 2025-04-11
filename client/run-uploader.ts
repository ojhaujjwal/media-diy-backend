import * as Http from "@effect/platform/HttpClient";
import { Resolver } from "@effect/rpc";
import { HttpResolver } from "@effect/rpc-http";
import { Console, Effect, Sink, Stream } from "effect";
import type { ClientRouter } from "../src/http/app-server-factory";
import { GenerateUploadPresignedUrlequest, MediaType } from "../src/http/request/generate-upload-presigned-url.request";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { isFile } from "@effect/platform/FileSystem";
import path from "path";
//import { uploadDirFiles } from "./upload-dir-files";
import { getFiles } from "./upload-dir-files";


// const rpcClientResolver = HttpResolver.make<ClientRouter>(
//   Http.client.fetchOk.pipe(
//     Http.client.mapRequest(
//       Http.request.prependUrl("http://localhost:9000/rpc"),
//     ),
//   ),
// );

// const rpcClient = Resolver.toClient(rpcClientResolver);

const filePath = process.argv[2];


const program = getFiles(filePath)
  .pipe(Stream.runForEach((files) => {
    for (const file of files) {
      console.log(file);
    }
    return Console.log(files);
  }))
  .pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(Http.client.layer),
  );

  NodeRuntime.runMain(program);
