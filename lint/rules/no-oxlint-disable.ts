import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow oxlint-disable and eslint-disable comments"
    },
    messages: {
      noOxlintDisable: "Do not use oxlint-disable or eslint-disable comments. Fix the underlying issue instead."
    },
    schema: []
  },
  create(context) {
    return {
      Program(node) {
        for (const comment of node.comments) {
          if (/oxlint-disable|eslint-disable/.test(comment.value)) {
            context.report({
              node: comment,
              messageId: "noOxlintDisable"
            });
          }
        }
      }
    };
  }
});
