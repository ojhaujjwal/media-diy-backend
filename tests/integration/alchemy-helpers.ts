import type { ConfigError } from "effect/Config";
import * as Effect from "effect/Effect";
import * as Alchemy from "alchemy";
import { evalStack, type CompiledStack, type StackEffect } from "alchemy/Stack";

/**
 * Deploy an alchemy Stack to a stage. Copied from alchemy/src/Deploy.ts
 * (uses only public API: evalStack from alchemy/Stack + Plan.make + apply
 * from the main alchemy entry). Self-contained — evalStack provides all
 * platform layers (AlchemyContextLive, FetchHttpClient, etc.).
 */
export const deployStack = <A>({
  stack,
  stage,
  force = false
}: {
  stack: StackEffect<CompiledStack<A>, ConfigError, never>;
  stage: string;
  force?: boolean;
}) =>
  evalStack(
    stack,
    (compiled) =>
      Effect.gen(function* () {
        const plan = yield* Alchemy.Plan.make(compiled, { force });
        return yield* Alchemy.apply(plan);
      }),
    { stage }
  );

/**
 * Destroy an alchemy Stack. Uses the public `destroy` from the main
 * alchemy entry (re-exported from Destroy.ts).
 */
export const destroyStack = Alchemy.destroy;
