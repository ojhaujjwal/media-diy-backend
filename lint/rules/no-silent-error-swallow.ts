import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow catch handlers that silently swallow errors by returning Effect.void"
    },
    messages: {
      noSilentSwallow:
        "Do not silently swallow errors with '() => Effect.void'. Errors should be represented in the type system, not ignored. Either: (1) let the error propagate to the caller, (2) transform it with mapError to a different error type, or (3) handle it with meaningful recovery logic. Silent error swallowing hides bugs and breaks type safety."
    },
    schema: []
  },
  create(context) {
    function isEffectVoidOrUnit(node: ESTree.Node | null | undefined): boolean {
      if (!node) return false;
      if (node.type === "MemberExpression") {
        return (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          (node.property.name === "void" || node.property.name === "unit")
        );
      }
      return false;
    }

    function isVoidReturningHandler(node: ESTree.Node): boolean {
      if (node.type === "ArrowFunctionExpression") {
        if (isEffectVoidOrUnit(node.body)) {
          return true;
        }
        if (node.body && node.body.type === "BlockStatement") {
          const body = node.body.body;
          if (body.length === 1 && body[0].type === "ReturnStatement") {
            return isEffectVoidOrUnit(body[0].argument ?? null);
          }
        }
      }

      if (node.type === "FunctionExpression") {
        const body = node.body;
        if (body && body.type === "BlockStatement") {
          const stmts = body.body;
          if (stmts.length === 1 && stmts[0].type === "ReturnStatement") {
            return isEffectVoidOrUnit(stmts[0].argument ?? null);
          }
        }
      }

      return false;
    }

    function isCatchCall(node: ESTree.CallExpression): string | null {
      const callee = node.callee;

      if (callee.type === "MemberExpression") {
        const propName = callee.property.type === "Identifier" ? callee.property.name : null;
        if (propName === "catchTag" || propName === "catchAll" || propName === "catchTags") {
          if (callee.object.type === "Identifier" && callee.object.name === "Effect") {
            return propName;
          }
        }
      }

      return null;
    }

    return {
      CallExpression(node) {
        const catchType = isCatchCall(node);
        if (!catchType) return;

        let handlerArg: ESTree.Node | null = null;

        if (catchType === "catchTag" && node.arguments.length >= 2) {
          handlerArg = node.arguments[1];
        } else if (catchType === "catchAll" && node.arguments.length >= 1) {
          handlerArg = node.arguments[0];
        } else if (catchType === "catchTags" && node.arguments.length >= 1) {
          const obj = node.arguments[0];
          if (obj.type === "ObjectExpression") {
            for (const prop of obj.properties) {
              if (prop.type === "Property" && isVoidReturningHandler(prop.value)) {
                context.report({
                  node: prop.value,
                  messageId: "noSilentSwallow"
                });
              }
            }
          }
          return;
        }

        if (handlerArg && isVoidReturningHandler(handlerArg)) {
          context.report({
            node: handlerArg,
            messageId: "noSilentSwallow"
          });
        }
      }
    };
  }
});
