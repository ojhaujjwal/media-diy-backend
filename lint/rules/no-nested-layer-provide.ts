import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow nested Layer.provide calls"
    },
    messages: {
      nestedProvide:
        "Nested Layer.provide detected. Extract the inner Layer.provide to a separate variable or use Layer.provideMerge."
    },
    schema: []
  },
  create(context) {
    function isLayerProvide(node: ESTree.Node): boolean {
      if (node.type !== "CallExpression") return false;
      const callee = node.callee;
      return (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        callee.object.name === "Layer" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "provide"
      );
    }

    return {
      CallExpression(node) {
        if (!isLayerProvide(node)) return;

        for (const arg of node.arguments) {
          if (arg.type !== "SpreadElement" && isLayerProvide(arg)) {
            context.report({
              node: arg,
              messageId: "nestedProvide"
            });
          }
        }
      }
    };
  }
});
