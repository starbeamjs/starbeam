// eslint-disable-next-line unused-imports/no-unused-vars
const { Linter } = require("eslint");

exports.extends = [
  "plugin:@typescript-eslint/strict",
  "plugin:etc/recommended",
];

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
