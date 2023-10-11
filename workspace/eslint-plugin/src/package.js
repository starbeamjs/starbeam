// eslint-disable-next-line unused-imports/no-unused-vars
const { ESLint, Linter } = require("eslint");

const BASE_IGNORE = ["node_modules", "dist", "tests", "html"];

/** @type {Linter.ConfigOverride<Linter.RulesRecord>[]} */
const BASE_OVERRIDES = [
  {
    files: ["*.json"],
    extends: ["plugin:@starbeam-dev/json:recommended"],
  },
  {
    files: ["*.js", "*.mjs"],
    extends: ["plugin:@starbeam-dev/typed-js"],
    parserOptions: {
      project: ["tsconfig.json"],
    },
  },
];

/** @type {ESLint.ConfigData} */
exports.library = {
  ignorePatterns: BASE_IGNORE,
  overrides: [
    ...BASE_OVERRIDES,
    {
      files: ["*.ts", "*.mts", "*.d.ts"],
      extends: ["plugin:@starbeam-dev/tight"],
      parserOptions: {
        project: ["tsconfig.json"],
      },
    },
  ],
};

/** @type {ESLint.ConfigData} */
exports.tests = {
  ignorePatterns: BASE_IGNORE,
  overrides: [
    ...BASE_OVERRIDES,
    {
      files: ["**/*.{tsx,ts}"],
      extends: ["plugin:@starbeam-dev/loose"],
      parserOptions: {
        project: "tsconfig.json",
      },
    },
  ],
};
