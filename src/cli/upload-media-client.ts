/* eslint-disable @typescript-eslint/no-explicit-any, local/no-type-assertion, @typescript-eslint/consistent-type-assertions */
import { Effect, Chunk, Console } from "effect";
import * as RpcClient from "@effect/rpc/RpcClient";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodeClient from "@effect/platform-node/NodeHttpClient";
import { MediaRpcs } from "../http/rpc-handler/rpc-definitions";
import { MediaType, FILE_EXTENSION_MAPPING } from "../domain/model/media";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const flattenExtensions = (
  mapping: Record<MediaType, readonly string[]>,
): Set<string> => {
  const extensions = new Set<string>();
  for (const exts of Object.values(mapping)) {
    for (const ext of exts) {
      extensions.add(ext.toLowerCase());
    }
  }
  return extensions;
};

const VALID_EXTENSIONS = flattenExtensions(FILE_EXTENSION_MAPPING);

const getFileExtension = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  return ext;
};

const isValidMediaFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return VALID_EXTENSIONS.has(ext);
};

const computeSha256 = (filePath: string): Effect.Effect<string> =>
  Effect.promise(() =>
    fs
      .readFile(filePath)
      .then((data) => crypto.createHash("sha256").update(data).digest("hex")),
  );

const getFileStats = (filePath: string): Effect.Effect<{ mtime: Date }> =>
  Effect.promise(() =>
    fs.stat(filePath).then((stats) => ({ mtime: stats.mtime })),
  );

const scanDirectory = (dirPath: string): Effect.Effect<Chunk.Chunk<string>> =>
  Effect.promise(() =>
    fs.readdir(dirPath, { withFileTypes: true }).then((entries) => {
      const files: string[] = [];
      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(path.join(dirPath, entry.name));
        }
      }
      return Chunk.fromIterable(files);
    }),
  );

interface CliOptions {
  directory: string;
  deviceId: string;
  serverUrl: string;
  dryRun: boolean;
}

const processFile =
  (client: RpcClient.FromGroup<typeof MediaRpcs>, options: CliOptions) =>
  (filePath: string): Effect.Effect<void> => {
    const filename = path.basename(filePath);

    if (!isValidMediaFile(filename)) {
      return Console.log(`Skipping ${filename}: unsupported extension`);
    }

    return computeSha256(filePath).pipe(
      Effect.flatMap((sha256Hash) => {
        const findRequest = client.FindMediaByHashRequest({ sha256Hash });

        return Effect.flatMap(findRequest, () =>
          Console.log(`Skipped (already uploaded): ${filename}`),
        ).pipe(
          Effect.catchAll((error) => {
            const err = error as { _tag?: string; errorCode?: string };
            if (
              err._tag === "FindMediaByHashError" &&
              err.errorCode === "not_found"
            ) {
              if (options.dryRun) {
                return Console.log(
                  `[DRY RUN] Would upload: ${filename} (hash: ${sha256Hash})`,
                );
              }

              return getFileStats(filePath).pipe(
                Effect.flatMap(({ mtime }) => {
                  const id = crypto.randomUUID();
                  const ext = getFileExtension(filename);

                  let mediaType: MediaType;
                  if (
                    FILE_EXTENSION_MAPPING[MediaType.VIDEO].includes(
                      ext as (typeof FILE_EXTENSION_MAPPING)[typeof MediaType.VIDEO][number],
                    )
                  ) {
                    mediaType = MediaType.VIDEO;
                  } else if (
                    FILE_EXTENSION_MAPPING[MediaType.LIVE_PHOTO].includes(
                      ext as (typeof FILE_EXTENSION_MAPPING)[typeof MediaType.LIVE_PHOTO][number],
                    )
                  ) {
                    mediaType = MediaType.LIVE_PHOTO;
                  } else {
                    mediaType = MediaType.PHOTO;
                  }

                  const uploadRequest = client.UploadMediaRequest({
                    id,
                    originalFileName: filename,
                    sha256Hash,
                    type: mediaType,
                    deviceId: options.deviceId,
                    filePath,
                    capturedAt: mtime,
                  });

                  return Effect.flatMap(uploadRequest, () =>
                    Console.log(`Uploaded: ${filename} (id: ${id})`),
                  ).pipe(
                    Effect.catchAll((e) =>
                      Console.error(
                        `Error uploading ${filename}: ${JSON.stringify(e)}`,
                      ),
                    ),
                  );
                }),
              );
            }
            return Console.error(
              `Error checking hash for ${filename}: ${JSON.stringify(error)}`,
            );
          }),
        );
      }),
      Effect.catchAll((e) =>
        Console.error(`Error processing ${filename}: ${JSON.stringify(e)}`),
      ),
    );
  };

const processFiles =
  (client: RpcClient.FromGroup<typeof MediaRpcs>, options: CliOptions) =>
  (files: Chunk.Chunk<string>): Effect.Effect<void> => {
    const sortedFiles = Chunk.toArray(files).sort();
    return Effect.forEach(sortedFiles, (file) =>
      processFile(client, options)(file),
    );
  };

const program = (options: CliOptions): any => {
  const clientPromise = RpcClient.make(MediaRpcs);

  const initStep = Console.log(`Scanning directory: ${options.directory}`).pipe(
    Effect.flatMap(() => Console.log(`Server: ${options.serverUrl}`)),
    Effect.flatMap(() => Console.log(`Device ID: ${options.deviceId}`)),
    Effect.flatMap(() =>
      options.dryRun
        ? Console.log("Mode: DRY RUN (no files will be uploaded)")
        : Effect.void,
    ),
    Effect.flatMap(() => Console.log("")),
  );

  return (clientPromise as any).pipe(
    Effect.flatMap((client: any) =>
      initStep.pipe(
        Effect.flatMap(() => scanDirectory(options.directory)),
        Effect.flatMap((files) => {
          const count = Chunk.size(files);
          return Console.log(`Found ${count} files`).pipe(
            Effect.flatMap(() => processFiles(client, options)(files) as any),
          );
        }),
      ),
    ),
  );
};

const rpcClientLayer = RpcClient.layerProtocolHttp({
  url: "http://localhost:3000/rpc",
});

const cli = program({
  directory: "/Users/uo/Projects/media-diy-backend/test-media",
  deviceId: "device-001",
  serverUrl: "http://localhost:3000/rpc",
  dryRun: true,
});

Effect.runPromise(
  cli.pipe(
    Effect.provide(rpcClientLayer),
    Effect.provide([FetchHttpClient.layer, RpcSerialization.layerJson]),
    Effect.provide(NodeClient.layer),
    Effect.provide(NodeFileSystem.layer),
  ),
);
