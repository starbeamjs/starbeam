// @ts-check

/** @type {import("eslint").Linter.BaseConfig} */
exports.rules = {
  parser: "@typescript-eslint/parser",
  plugins: [
    "import",
    "unused-imports",
    "simple-import-sort",
    "prettier",
    "@typescript-eslint",
  ],
  extends: [
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:json/recommended",
  ],

  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "import/no-relative-packages": "error",
  },
};

/**
 * @param {string} tsconfigPath
 * @param {import("./.eslint.shared.cjs").TypescriptConfig} [config]
 * @returns {import("eslint").Linter.Config}
 */
exports.typescript = (tsconfigPath, config = {}) => {
  const ts = config?.ts;
  const rules = (config.rules ||= {});

  if (ts) {
    for (const [key, value] of Object.entries(ts)) {
      rules[`@typescript-eslint/${key}`] = value;
    }
  }

  delete config?.ts;

  return {
    ...exports.rules,
    parser: "@typescript-eslint/parser",
    parserOptions: {
      sourceType: "module",
      project: tsconfigPath,
    },
    ...config,
    rules: {
      ...exports.rules.rules,
      ...rules,
    },
  };
};
