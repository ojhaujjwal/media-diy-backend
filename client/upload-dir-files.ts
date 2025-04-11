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

//Effect.andThen()

//TODO: implement recursive file reader if directory with stream output

export const getFiles = (dirPath: string) =>
  Effect.all([FileSystem.FileSystem]).pipe(
    Effect.flatMap(([fs]) => Effect.all([Effect.succeed(fs), fs.readDirectory(dirPath)])),
    Effect.map(function* ([fs, files]) {
        for (const file of files) {
          yield file;
        }
    }),
  );


const getFilesRecursively = (dirPath: string) => {
  const stream = Stream.fromIterableEffect(getFiles(dirPath));
  return stream.pipe
};


// export const uploadDirFiles = (dirPath: string) =>
//   getFiles(dirPath).pipe(
//     Stream.runForEach
//   );

// export const getFilesRecursively = (dirPath: string) => 
//   Effect.gen(function* () {
//     const fs = yield* FileSystem.FileSystem;
  
//     const files = yield* fs.readDirectory(dirPath);
  
//     for (const file of files) {
//       //console.log(file);
  
//       const fileInfo = yield* fs.stat(path.join(dirPath, file));
  
  
//       //console.log(fileInfo.type === 'File');

//       if (fileInfo.type === 'Directory') {
//         yield* getFilesRecursively(path.join(dirPath, file));
//       } else {
//         yield file;
//       }
//     }
//   });

