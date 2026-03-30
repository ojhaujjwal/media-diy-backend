import { Effect, Chunk, Console, Layer, pipe } from "effect";
import * as RpcClient from "@effect/rpc/RpcClient";
import * as RpcSerialization from "@effect/rpc/RpcSerialization";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodeClient from "@effect/platform-node/NodeHttpClient";
import { MediaRpcs } from "../http/rpc-handler/rpc-definitions";
import { MediaType, FILE_EXTENSION_MAPPING } from "../domain/model/media";
import { ERROR_CODE } from "../http/request/find-media-by-hash.request";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const parseArgs = (
  args: string[],
): {
  directory: string;
  deviceId: string;
  serverUrl: string;
  dryRun: boolean;
} => {
  const directory = args[2];
  if (!directory) {
    console.error(
      "Usage: tsx src/cli/upload-media-client.ts <directory> [--device-id <id>] [--server-url <url>] [--dry-run]",
    );
    process.exit(1);
  }

  let deviceId = "device-001";
  let serverUrl = "http://localhost:3000/rpc";
  let dryRun = false;

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--device-id" && i + 1 < args.length) {
      deviceId = args[++i];
    } else if (arg === "--server-url" && i + 1 < args.length) {
      serverUrl = args[++i];
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { directory, deviceId, serverUrl, dryRun };
};

const { directory, deviceId, serverUrl, dryRun } = parseArgs(process.argv);

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

const getMediaTypeFromExtension = (ext: string): MediaType => {
  const videoExtensions = FILE_EXTENSION_MAPPING[MediaType.VIDEO];
  const livePhotoExtensions = FILE_EXTENSION_MAPPING[MediaType.LIVE_PHOTO];

  for (const videoExt of videoExtensions) {
    if (videoExt.toLowerCase() === ext.toLowerCase()) {
      return MediaType.VIDEO;
    }
  }

  for (const livePhotoExt of livePhotoExtensions) {
    if (livePhotoExt.toLowerCase() === ext.toLowerCase()) {
      return MediaType.LIVE_PHOTO;
    }
  }

  return MediaType.PHOTO;
};

const program = (options: CliOptions) =>
  Effect.gen(function* () {
    const client = yield* RpcClient.make(MediaRpcs);

    yield* Console.log(`Scanning directory: ${options.directory}`);
    yield* Console.log(`Server: ${options.serverUrl}`);
    yield* Console.log(`Device ID: ${options.deviceId}`);
    if (options.dryRun) {
      yield* Console.log("Mode: DRY RUN (no files will be uploaded)");
    }
    yield* Console.log("");

    const files = yield* scanDirectory(options.directory);
    const count = Chunk.size(files);
    yield* Console.log(`Found ${count} files`);

    const sortedFiles = Chunk.toArray(files).sort();

    for (const filePath of sortedFiles) {
      const filename = path.basename(filePath);

      if (!isValidMediaFile(filename)) {
        yield* Console.log(`Skipping ${filename}: unsupported extension`);
        continue;
      }

      const sha256Hash = yield* computeSha256(filePath);

      const findResult = yield* client
        .FindMediaByHashRequest({ sha256Hash })
        .pipe(Effect.either);

      if (findResult._tag === "Right") {
        yield* Console.log(`Skipped (already uploaded): ${filename}`);
        continue;
      }

      const error = findResult.left;
      if (
        error._tag !== "FindMediaByHashError" ||
        error.errorCode !== ERROR_CODE.NOT_FOUND
      ) {
        yield* Console.error(
          `Error checking hash for ${filename}: ${JSON.stringify(error)}`,
        );
        continue;
      }

      if (options.dryRun) {
        yield* Console.log(
          `[DRY RUN] Would upload: ${filename} (hash: ${sha256Hash})`,
        );
        continue;
      }

      const stats = yield* getFileStats(filePath);
      const id = crypto.randomUUID();
      const ext = getFileExtension(filename);
      const mediaType = getMediaTypeFromExtension(ext);

      const uploadResult = yield* client
        .UploadMediaRequest({
          id,
          originalFileName: filename,
          sha256Hash,
          type: mediaType,
          deviceId: options.deviceId,
          filePath,
          capturedAt: stats.mtime,
        })
        .pipe(Effect.either);

      if (uploadResult._tag === "Left") {
        yield* Console.error(
          `Error uploading ${filename}: ${JSON.stringify(uploadResult.left)}`,
        );
      } else {
        yield* Console.log(`Uploaded: ${filename} (id: ${id})`);
      }
    }
  });

const rpcClientLayer = pipe(
  RpcClient.layerProtocolHttp({
    url: serverUrl,
  }),
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson]),
);

const allLayers = Layer.mergeAll(NodeClient.layer, NodeFileSystem.layer);

const cli = program({
  directory,
  deviceId,
  serverUrl,
  dryRun,
});

Effect.runPromise(
  cli.pipe(
    Effect.scoped,
    Effect.provide(Layer.mergeAll(rpcClientLayer, allLayers)),
  ),
);
