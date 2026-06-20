import { Schema as S } from "effect";

export enum ERROR_CODE {
  SERVER_ERROR = "server_error"
}

export class FastScanError extends S.TaggedErrorClass<FastScanError>()("FastScanError", {
  errorCode: S.Enum(ERROR_CODE)
}) {}

export class FastScanResponse extends S.Class<FastScanResponse>("FastScanResponse")({
  existingSmbPaths: S.Array(S.String)
}) {}
