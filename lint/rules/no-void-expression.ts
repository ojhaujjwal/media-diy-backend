import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow void expressions - they are no-ops"
    },
    messages: {
      noVoidExpression:
        "'void {{expression}}' is a no-op. It evaluates the expression and discards the result. Remove it or use the value."
    },
    schema: []
  },
  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator === "void") {
          const expression = context.sourceCode.getText(node.argument);
          context.report({
            node,
            messageId: "noVoidExpression",
            data: { expression }
          });
        }
      }
    };
  }
});
