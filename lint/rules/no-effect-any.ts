// @effect-diagnostics *:off
import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

/**
 * Checks if a type name ends with "Effect" (e.g. `Effect`, `Effect.Effect`).
 */
function isEffectType(typeName: ESTree.TSTypeName): boolean {
  if (typeName.type === "Identifier") {
    return typeName.name === "Effect";
  }
  if (typeName.type === "TSQualifiedName") {
    return typeName.right.name === "Effect";
  }
  return false;
}

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `any` as a type argument to Effect (e.g. `Effect<any, ...>`). Use concrete types instead."
    },
    messages: {
      noEffectAny: "Do not use `any` in Effect type parameters — it erases type safety. Use a concrete type instead."
    },
    schema: []
  },
  create(context) {
    return {
      TSTypeReference(node: ESTree.TSTypeReference) {
        if (!isEffectType(node.typeName)) return;
        const typeArgs = node.typeArguments;
        if (!typeArgs) return;

        const params = typeArgs.params;
        if (params.length === 0) return;

        // Check the first type parameter (success type) — this is always required.
        // For 1-param usage (`Effect<any>`) or 2-param usage (`Effect<any, E>`),
        // or 3-param usage (`Effect<any, E, R>`), the first param must not be `any`.
        const first = params[0];
        if (first && first.type === "TSAnyKeyword") {
          context.report({ node: first, messageId: "noEffectAny" });
        }

        // If there's a second type parameter (error type), it must not be `any`.
        if (params.length >= 2) {
          const second = params[1];
          if (second && second.type === "TSAnyKeyword") {
            context.report({ node: second, messageId: "noEffectAny" });
          }
        }
      }
    };
  }
});
