import { defineRule } from "@oxlint/plugins";

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow disableValidation: true in Schema operations"
    },
    messages: {
      noDisableValidation:
        "Do not use { disableValidation: true }. Schema validation should always be enabled to catch invalid data. If you're seeing validation errors, fix the data or schema instead of disabling validation."
    },
    schema: []
  },
  create(context) {
    return {
      Property(node) {
        const key = node.key;
        const value = node.value;
        const keyIsDisableValidation =
          (key.type === "Identifier" && key.name === "disableValidation") ||
          (key.type === "Literal" && key.value === "disableValidation");
        const valueIsTrue = value.type === "Literal" && value.value === true;

        if (keyIsDisableValidation && valueIsTrue) {
          context.report({
            node,
            messageId: "noDisableValidation"
          });
        }
      }
    };
  }
});
