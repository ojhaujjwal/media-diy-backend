import { definePlugin } from "@oxlint/plugins";
import noDisableValidation from "./rules/no-disable-validation.js";
import pipeMaxArguments from "./rules/pipe-max-arguments.js";
import noNestedLayerProvide from "./rules/no-nested-layer-provide.js";
import noServiceOption from "./rules/no-service-option.js";
import noVoidExpression from "./rules/no-void-expression.js";
import noEffectIgnore from "./rules/no-effect-ignore.js";
import noEffectCatchallcause from "./rules/no-effect-catchallcause.js";
import noEffectAsvoid from "./rules/no-effect-asvoid.js";
import noSilentErrorSwallow from "./rules/no-silent-error-swallow.js";
import noSatisfies from "./rules/no-satisfies.js";
import noOxlintDisable from "./rules/no-oxlint-disable.js";

export default definePlugin({
  meta: { name: "media-diy" },
  rules: {
    "no-disable-validation": noDisableValidation,
    "pipe-max-arguments": pipeMaxArguments,
    "no-nested-layer-provide": noNestedLayerProvide,
    "no-service-option": noServiceOption,
    "no-void-expression": noVoidExpression,
    "no-effect-ignore": noEffectIgnore,
    "no-effect-catchallcause": noEffectCatchallcause,
    "no-effect-asvoid": noEffectAsvoid,
    "no-silent-error-swallow": noSilentErrorSwallow,
    "no-satisfies": noSatisfies,
    "no-oxlint-disable": noOxlintDisable
  }
});
