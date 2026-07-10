// @effect-diagnostics *:off
import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow process global. Use Effect Config (Config.string, Config.redacted) for configuration values."
    },
    messages: {
      noProcess: "Do not use 'process'. Use Effect Config (Config.string, Config.redacted) for configuration values."
    },
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        const isDirectProcess = node.object.type === "Identifier" && node.object.name === "process";

        const isGlobalThisProcess =
          node.object.type === "MemberExpression" &&
          node.object.object.type === "Identifier" &&
          node.object.object.name === "globalThis" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "process";

        if (isDirectProcess || isGlobalThisProcess) {
          const propertyName = node.property.type === "Identifier" ? node.property.name : null;

          if (propertyName === "argv") {
            return;
          }

          context.report({
            node,
            messageId: "noProcess"
          });
        }
      }
    };
  }
});
