// @ts-check

const { ESLint, Linter } = require("eslint");

/** @type {Linter.RulesRecord} */
const MAGIC_NUMBERS = {
  "no-magic-numbers": "off",
  "@typescript-eslint/no-magic-numbers": [
    "error",
    {
      ignoreNumericLiteralTypes: true,
      ignoreReadonlyClassProperties: true,
      ignoreTypeIndexes: true,
      ignoreEnums: true,
    },
  ],
};

/** @type {Linter.RulesRecord} */
const TIGHT_RULES = {
  ...MAGIC_NUMBERS,
};

const base = require("./src/base.js");
const tight = require("./src/tight.js");
const demos = require("./src/demos.js");

/** @type {ESLint.Plugin} */
module.exports = {
  configs: {
    tight: {
      ...base.config,
      extends: [...base.extends, ...tight.extends],
      rules: { ...base.rules, ...tight.rules },
    },
    loose: {
      ...base.config,
      extends: base.extends,
      rules: base.rules,
    },
    demos: {
      ...base.config,
      extends: [...base.extends, ...tight.extends],
      rules: { ...base.rules, ...demos.rules },
    },
  },
};
