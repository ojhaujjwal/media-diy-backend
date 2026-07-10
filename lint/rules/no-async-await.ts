// @effect-diagnostics *:off
import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow async/await and Promise constructors — use Effect APIs instead"
    },
    messages: {
      noAsync: "Do not use `async` functions. Use Effect APIs (`Effect.gen`, `Effect.tryPromise`, etc.) instead.",
      noAwait: "Do not use `await`. Use Effect APIs (`yield*`, `Effect.flatMap`, etc.) instead.",
      noNewPromise: "Do not use `new Promise(...)`. Use `Effect.async` or `Effect.tryPromise` instead."
    },
    schema: []
  },
  create(context) {
    return {
      FunctionDeclaration(node) {
        if (node.async) {
          context.report({ node, messageId: "noAsync" });
        }
      },
      FunctionExpression(node) {
        if (node.async) {
          context.report({ node, messageId: "noAsync" });
        }
      },
      ArrowFunctionExpression(node) {
        if (node.async) {
          context.report({ node, messageId: "noAsync" });
        }
      },
      AwaitExpression(node) {
        context.report({ node, messageId: "noAwait" });
      },
      NewExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "Promise") {
          context.report({ node, messageId: "noNewPromise" });
        }
      }
    };
  }
});
