// @ts-check

const { Linter } = require("eslint");

exports.extends = ["plugin:@typescript-eslint/strict"];

/** @type {Linter.RulesRecord} */
const MAGIC_NUMBERS = {
  "no-magic-numbers": "off",
  "@typescript-eslint/no-magic-numbers": [
    "warn",
    {
      ignoreNumericLiteralTypes: true,
      ignoreReadonlyClassProperties: true,
      ignoreTypeIndexes: true,
      ignoreEnums: true,
    },
  ],
};

/** @type {Linter.RulesRecord} */
exports.rules = {
  ...MAGIC_NUMBERS,
};
