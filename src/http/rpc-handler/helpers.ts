import { Effect } from "effect";

export const errorHandler: <E1, E2>(parameters: {
  failureResult: E1;
}) => (receivedError: E2) => Effect.Effect<never, E1> =
  ({ failureResult }) =>
  (receivedError) =>
  {
    console.error(receivedError);
    console.error((receivedError as any)?.previous);
    return Effect.logError(receivedError).pipe(
      Effect.flatMap(() => Effect.fail(failureResult)),
    );
  };
