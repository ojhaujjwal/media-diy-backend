// @effect-diagnostics *:off
import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow `new Date()` and `Date.now()` — use `Effect/Clock` instead"
    },
    messages: {
      noNewDate:
        "Do not use `new Date(...)`. Use `Effect.Clock` (`yield* Clock.currentTimeMillis`, etc.) or `DateTime` for current time. In tests, use a fixed date literal instead of `new Date()`.",
      noDateNow: "Do not use `Date.now()`. Use `yield* Clock.currentTimeMillis` from `Effect/Clock` instead."
    },
    schema: []
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "Date") {
          context.report({ node, messageId: "noNewDate" });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "Date" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "now"
        ) {
          context.report({ node, messageId: "noDateNow" });
        }
      }
    };
  }
});
