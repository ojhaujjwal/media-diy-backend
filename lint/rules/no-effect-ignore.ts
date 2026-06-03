import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Effect.ignore - errors should be explicitly handled"
    },
    messages: {
      noEffectIgnore:
        "Do not use Effect.ignore. It silently discards errors which hides bugs. Handle errors explicitly with Effect.catchTag, Effect.catchAll, or propagate them."
    },
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          node.property.name === "ignore"
        ) {
          context.report({
            node,
            messageId: "noEffectIgnore"
          });
        }
      }
    };
  }
});
