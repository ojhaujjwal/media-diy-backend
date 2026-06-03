import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow satisfies expressions - they bypass type safety"
    },
    messages: {
      noSatisfies:
        "Do not use satisfies expressions. They bypass TypeScript's type safety. Refactor to use proper types or type guards instead."
    },
    schema: []
  },
  create(context) {
    return {
      TSSatisfiesExpression(node) {
        context.report({ node, messageId: "noSatisfies" });
      }
    };
  }
});
