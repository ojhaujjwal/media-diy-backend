import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierConfig from "eslint-config-prettier";

/**
 * Custom ESLint rule to ban { disableValidation: true } in Schema.make() calls.
 * Disabling validation defeats the purpose of using Schema and can hide bugs.
 */
const noDisableValidationRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow disableValidation: true in Schema operations",
    },
    messages: {
      noDisableValidation:
        "Do not use { disableValidation: true }. Schema validation should always be enabled to catch invalid data. If you're seeing validation errors, fix the data or schema instead of disabling validation.",
    },
    schema: [],
  },
  create(context) {
    return {
      Property(node) {
        if (
          node.key &&
          ((node.key.type === "Identifier" &&
            node.key.name === "disableValidation") ||
            (node.key.type === "Literal" &&
              node.key.value === "disableValidation")) &&
          node.value &&
          node.value.type === "Literal" &&
          node.value.value === true
        ) {
          context.report({
            node,
            messageId: "noDisableValidation",
          });
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to warn when .pipe() has too many arguments.
 * Long pipes are hard to read and should be split into multiple .pipe() calls.
 */
const pipeMaxArgumentsRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow .pipe() with more than 20 arguments",
    },
    messages: {
      tooManyArgs:
        ".pipe() has {{count}} arguments. Consider splitting into multiple .pipe() calls for readability (max 20).",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        // Check for .pipe() method call
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "pipe"
        ) {
          if (node.arguments.length > 20) {
            context.report({
              node,
              messageId: "tooManyArgs",
              data: { count: node.arguments.length },
            });
          }
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to ban Effect.asVoid usage.
 * Effect.asVoid is usually unnecessary because `void` allows any value to be returned.
 * The return type Effect<void, E, R> already accepts any success value.
 */
const noEffectAsVoidRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Effect.asVoid - it is usually unnecessary",
    },
    messages: {
      noEffectAsVoid:
        "Effect.asVoid is usually unnecessary. The `void` return type already allows any value to be returned from an effect. Remove it.",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          node.property.name === "asVoid"
        ) {
          context.report({
            node,
            messageId: "noEffectAsVoid",
          });
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to ban Effect.ignore usage.
 * Effect.ignore silently discards errors which hides bugs.
 * Errors should be explicitly handled or propagated.
 */
const noEffectIgnoreRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Effect.ignore - errors should be explicitly handled",
    },
    messages: {
      noEffectIgnore:
        "Do not use Effect.ignore. It silently discards errors which hides bugs. Handle errors explicitly with Effect.catchTag, Effect.catchAll, or propagate them.",
    },
    schema: [],
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
            messageId: "noEffectIgnore",
          });
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to ban Effect.catchAllCause usage.
 * catchAllCause catches defects (bugs) which should crash the program.
 * Use Effect.catchAll or Effect.catchTag for expected errors only.
 */
const noEffectCatchAllCauseRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Effect.catchAllCause - it catches defects which should not be caught",
    },
    messages: {
      noEffectCatchAllCause:
        "Do not use Effect.catchAllCause. It catches defects (bugs) which should crash the program. Use Effect.catchAll or Effect.catchTag to handle expected errors only.",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "Effect" &&
          node.property.type === "Identifier" &&
          node.property.name === "catchAllCause"
        ) {
          context.report({
            node,
            messageId: "noEffectCatchAllCause",
          });
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to ban silently swallowing errors with catch handlers that return Effect.void.
 * Patterns like:
 *   Effect.catchTag("SomeError", () => Effect.void)
 *   Effect.catchAll(() => Effect.void)
 *   .pipe(Effect.catchTag("SomeError", () => Effect.void))
 *
 * These silently discard errors which hides bugs. Errors should be:
 * - Logged and re-raised
 * - Transformed to a different error type
 * - Handled with meaningful recovery logic
 */
const noSilentErrorSwallowRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow catch handlers that silently swallow errors by returning Effect.void",
    },
    messages: {
      noSilentSwallow:
        "Do not silently swallow errors with '() => Effect.void'. Errors should be represented in the type system, not ignored. Either: (1) let the error propagate to the caller, (2) transform it with mapError to a different error type, or (3) handle it with meaningful recovery logic. Silent error swallowing hides bugs and breaks type safety.",
    },
    schema: [],
  },
  create(context) {
    // Check if a node is Effect.void or Effect.unit
    function isEffectVoidOrUnit(node) {
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

    // Check if a node is an arrow function or function returning Effect.void
    function isVoidReturningHandler(node) {
      if (!node) return false;

      // Arrow function: () => Effect.void
      if (node.type === "ArrowFunctionExpression") {
        // Direct return: () => Effect.void
        if (isEffectVoidOrUnit(node.body)) {
          return true;
        }
        // Block with return: () => { return Effect.void }
        if (node.body.type === "BlockStatement") {
          const body = node.body.body;
          if (body.length === 1 && body[0].type === "ReturnStatement") {
            return isEffectVoidOrUnit(body[0].argument);
          }
        }
      }

      // Regular function: function() { return Effect.void }
      if (node.type === "FunctionExpression") {
        const body = node.body.body;
        if (body.length === 1 && body[0].type === "ReturnStatement") {
          return isEffectVoidOrUnit(body[0].argument);
        }
      }

      return false;
    }

    // Check if a CallExpression is a catch method (catchTag, catchAll, catchTags)
    function isCatchCall(node) {
      if (node.type !== "CallExpression") return false;
      const callee = node.callee;

      // Effect.catchTag(), Effect.catchAll(), Effect.catchTags()
      if (callee.type === "MemberExpression") {
        const propName =
          callee.property.type === "Identifier" ? callee.property.name : null;
        if (
          propName === "catchTag" ||
          propName === "catchAll" ||
          propName === "catchTags"
        ) {
          // Check if it's Effect.catchX or something.pipe(Effect.catchX)
          if (
            callee.object.type === "Identifier" &&
            callee.object.name === "Effect"
          ) {
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

        // For catchTag("ErrorName", handler), handler is the second argument
        // For catchAll(handler), handler is the first argument
        // For catchTags({ ErrorName: handler }), check the object values
        let handlerArg = null;

        if (catchType === "catchTag" && node.arguments.length >= 2) {
          handlerArg = node.arguments[1];
        } else if (catchType === "catchAll" && node.arguments.length >= 1) {
          handlerArg = node.arguments[0];
        } else if (catchType === "catchTags" && node.arguments.length >= 1) {
          // catchTags({ ErrorA: handler1, ErrorB: handler2 })
          const obj = node.arguments[0];
          if (obj.type === "ObjectExpression") {
            for (const prop of obj.properties) {
              if (
                prop.type === "Property" &&
                isVoidReturningHandler(prop.value)
              ) {
                context.report({
                  node: prop.value,
                  messageId: "noSilentSwallow",
                });
              }
            }
          }
          return;
        }

        if (handlerArg && isVoidReturningHandler(handlerArg)) {
          context.report({
            node: handlerArg,
            messageId: "noSilentSwallow",
          });
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to ban void expressions (e.g., void someValue).
 * void X is a no-op that evaluates X and discards the result.
 * This is usually a mistake or unnecessary.
 */
const noVoidExpressionRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow void expressions - they are no-ops",
    },
    messages: {
      noVoidExpression:
        "'void {{expression}}' is a no-op. It evaluates the expression and discards the result. Remove it or use the value.",
    },
    schema: [],
  },
  create(context) {
    return {
      UnaryExpression(node) {
        if (node.operator === "void") {
          const expression = context.getSourceCode().getText(node.argument);
          context.report({
            node,
            messageId: "noVoidExpression",
            data: { expression },
          });
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to ban Effect.serviceOption usage.
 * Services should always be present in context, even during testing.
 * Using serviceOption makes it easy to forget to provide a service.
 */
const noServiceOptionRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Effect.serviceOption - services should always be present in context",
    },
    messages: {
      noServiceOption:
        "Do not use Effect.serviceOption. Services should always be present in context, even during testing. Yield the service directly (yield* MyService) and ensure it is provided in your layer composition.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        // Check for Effect.serviceOption()
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "Effect" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "serviceOption"
        ) {
          context.report({
            node,
            messageId: "noServiceOption",
          });
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to warn when Layer.provide is nested inside another Layer.provide.
 * Nested Layer.provide calls are confusing and should be refactored.
 */
const noNestedLayerProvideRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow nested Layer.provide calls",
    },
    messages: {
      nestedProvide:
        "Nested Layer.provide detected. Extract the inner Layer.provide to a separate variable or use Layer.provideMerge.",
    },
    schema: [],
  },
  create(context) {
    function isLayerProvide(node) {
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

        // Check if any argument is also a Layer.provide call
        for (const arg of node.arguments) {
          if (isLayerProvide(arg)) {
            context.report({
              node: arg,
              messageId: "nestedProvide",
            });
          }
        }
      },
    };
  },
};

/**
 * Custom ESLint rule to ban type assertions (as Type, <Type>, satisfies).
 * Type assertions bypass type safety and should be avoided.
 * Exception: allows 'as const' for literal type inference.
 */
const noTypeAssertionRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow type assertions - they bypass type safety",
    },
    messages: {
      noTypeAssertion:
        "Do not use type assertions (as Type, <Type>, or satisfies). They bypass TypeScript's type safety. Refactor to use proper types or type guards instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      TSAsExpression(node) {
        // Allow 'as const' - it's not a type assertion but a literal type modifier
        if (
          node.typeAnnotation.type === "TSTypeReference" &&
          node.typeAnnotation.typeName.type === "Identifier" &&
          node.typeAnnotation.typeName.name === "const"
        ) {
          return;
        }

        context.report({
          node,
          messageId: "noTypeAssertion",
        });
      },
      TSSatisfiesExpression(node) {
        context.report({
          node,
          messageId: "noTypeAssertion",
        });
      },
      TSTypeAssertion(node) {
        // Angle bracket type assertion: <Type>expr
        context.report({
          node,
          messageId: "noTypeAssertion",
        });
      },
    };
  },
};

const localPlugin = {
  rules: {
    "no-disable-validation": noDisableValidationRule,
    "pipe-max-arguments": pipeMaxArgumentsRule,
    "no-nested-layer-provide": noNestedLayerProvideRule,
    "no-service-option": noServiceOptionRule,
    "no-void-expression": noVoidExpressionRule,
    "no-effect-ignore": noEffectIgnoreRule,
    "no-effect-catchallcause": noEffectCatchAllCauseRule,
    "no-effect-asvoid": noEffectAsVoidRule,
    "no-silent-error-swallow": noSilentErrorSwallowRule,
    "no-type-assertion": noTypeAssertionRule,
  },
};

export default [
  {
    ignores: [
      // Build outputs
      "**/dist/**",
      "**/build/**",
      "**/.output/**",
      "**/.next/**",
      "**/.turbo/**",

      // Dependencies
      "**/node_modules/**",

      // Coverage
      "**/coverage/**",

      // Generated files
      "**/*.gen.ts",
      "**/*.gen.tsx",

      // Other
      "**/*.md",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      local: localPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Effect-specific custom rules
      "local/no-disable-validation": "error",
      "local/pipe-max-arguments": "error",
      "local/no-nested-layer-provide": "error",
      "local/no-service-option": "error",
      "local/no-void-expression": "error",
      "local/no-effect-ignore": "error",
      "local/no-effect-catchallcause": "error",
      "local/no-effect-asvoid": "error",
      "local/no-silent-error-swallow": "error",
      // Type assertion rule
      "local/no-type-assertion": "error",
      // Allow unused variables starting with underscore
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Prohibit any and type assertions
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "never",
        },
      ],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-namespace": "off",
      // Effect pattern: export both Schema constant and Type type with same name
      "no-redeclare": "off",
      // Effect uses generator functions that may not have explicit yield
      "require-yield": "off",
      // Prefer const assertions
      "prefer-const": "error",
      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
      // Object shorthand
      "object-shorthand": "error",
      // No fallthrough in switch cases
      "no-fallthrough": "off",
      // Disable no-undef for TypeScript (TypeScript handles this)
      "no-undef": "off",
    },
  },
  // Apply Prettier config to disable conflicting rules
  prettierConfig,
];
