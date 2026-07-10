import { Clock, DateTime, Effect } from "effect";
import { MediaContentsRepositoryError } from "../../domain/repository/media-contents.repository.js";

interface SigV4Params {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly region: string;
  readonly endpoint: string;
  readonly bucket: string;
  readonly key: string;
  readonly contentType: string;
  readonly expiresIn: number;
}

const encode = (s: string): ArrayBuffer => {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i);
  }
  return buf;
};

const rawKeyHmac = (rawKey: ArrayBuffer, message: ArrayBuffer) =>
  Effect.flatMap(
    Effect.tryPromise(() => crypto.subtle.importKey("raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])),
    (key) => Effect.tryPromise(() => crypto.subtle.sign({ name: "HMAC", hash: "SHA-256" }, key, message))
  );

const digestSha256 = (message: ArrayBuffer) => Effect.tryPromise(() => crypto.subtle.digest("SHA-256", message));

const bufToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const getSigningKey = (secretAccessKey: string, dateStamp: string, region: string) =>
  Effect.gen(function* () {
    const dateKey = yield* rawKeyHmac(encode(`AWS4${secretAccessKey}`), encode(dateStamp));
    const regionKey = yield* rawKeyHmac(dateKey, encode(region));
    const serviceKey = yield* rawKeyHmac(regionKey, encode("s3"));
    return yield* rawKeyHmac(serviceKey, encode("aws4_request"));
  });

const fromError = (e: unknown): MediaContentsRepositoryError =>
  new MediaContentsRepositoryError({
    message: e instanceof Error ? e.message : "SigV4 signing failed",
    reason: "UnknownError",
    previous: e instanceof Error ? e : undefined
  });

export const createPresignedUrl = (params: SigV4Params): Effect.Effect<string, MediaContentsRepositoryError, never> =>
  Effect.gen(function* () {
    const nowMs = yield* Clock.currentTimeMillis;
    const now = DateTime.makeUnsafe(nowMs);
    const { year, month, day, hour, minute, second } = DateTime.toPartsUtc(now);
    const amzDate =
      year.toString() +
      month.toString().padStart(2, "0") +
      day.toString().padStart(2, "0") +
      "T" +
      hour.toString().padStart(2, "0") +
      minute.toString().padStart(2, "0") +
      second.toString().padStart(2, "0") +
      "Z";
    const dateStamp = amzDate.slice(0, 8);

    const credential = `${params.accessKeyId}/${dateStamp}/${params.region}/s3/aws4_request`;
    const signedHeaders = "content-type;host";
    const host = new URL(params.endpoint).host;

    const canonicalQueryString =
      `X-Amz-Algorithm=AWS4-HMAC-SHA256` +
      `&X-Amz-Credential=${encodeURIComponent(credential)}` +
      `&X-Amz-Date=${amzDate}` +
      `&X-Amz-Expires=${params.expiresIn}` +
      `&X-Amz-SignedHeaders=${encodeURIComponent(signedHeaders)}`;

    const canonicalRequest =
      "PUT\n" +
      `/${params.bucket}/${params.key}\n` +
      `${canonicalQueryString}\n` +
      `content-type:${params.contentType}\n` +
      `host:${host}\n` +
      "\n" +
      `${signedHeaders}\n` +
      "UNSIGNED-PAYLOAD";

    const canonicalRequestHash = yield* digestSha256(encode(canonicalRequest)).pipe(
      Effect.map(bufToHex),
      Effect.mapError(fromError)
    );

    const stringToSign =
      "AWS4-HMAC-SHA256\n" + `${amzDate}\n` + `${dateStamp}/${params.region}/s3/aws4_request\n` + canonicalRequestHash;

    const signingKey = yield* getSigningKey(params.secretAccessKey, dateStamp, params.region).pipe(
      Effect.mapError(fromError)
    );

    const signature = yield* rawKeyHmac(signingKey, encode(stringToSign)).pipe(
      Effect.map(bufToHex),
      Effect.mapError(fromError)
    );

    return `${params.endpoint}/${params.bucket}/${params.key}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }).pipe(Effect.mapError(fromError));
