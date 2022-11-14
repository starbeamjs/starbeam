// eslint-disable-next-line unused-imports/no-unused-vars
const { ESLint, Linter } = require("eslint");

/** @type {ESLint.ConfigData} */
exports.parser = {
  parser: "jsonc-eslint-parser",
};

exports["package.json"] = json({
  "jsonc/sort-keys": [
    "error",
    {
      hasProperties: ["types", "default"],
      order: ["types", "import", "default"],
      pathPattern: ".*",
    },
    {
      pathPattern: "^$",
      order: [
        "private",
        "name",
        "version",
        "description",
        "type",
        "main",
        "module",
        "types",
        "exports",
        "publishConfig",
        {
          keyPattern: "starbeam.*",
          order: { natural: true },
        },
        "scripts",
        {
          keyPattern: "^.*[dD]ependencies$",
          order: { natural: true },
        },
        {
          order: { natural: true },
        },
      ],
    },
    {
      order: { natural: true },
      pathPattern: ".*",
    },
  ],
});

exports[".eslintrc.json"] = jsonc({
  "jsonc/sort-keys": [
    "error",
    {
      hasProperties: ["files"],
      order: [
        "extends",
        "parser",
        "files",
        {
          keyPattern: ".*",
          order: { type: "asc", natural: true },
        },
      ],
      pathPattern: ".*",
    },
    {
      hasProperties: ["root"],
      order: [
        "root",
        "ignorePatterns",
        "parser",
        "parserOptions",
        "settings",
        "plugins",
        "overrides",
        {
          order: { type: "asc", natural: true },
        },
      ],
      pathPattern: "^$",
    },
    {
      pathPattern: "^rules$",
      order: {
        type: "asc",
        natural: true,
      },
    },
  ],
});

exports["tsconfig.json"] = jsonc({
  "jsonc/sort-keys": [
    "error",
    {
      order: [
        "extends",
        "compilerOptions",
        {
          keyPattern: ".*",
          order: { type: "asc", natural: true },
        },
        "files",
        "include",
        "exclude",
        "references",
      ],
      pathPattern: "^$",
    },
  ],
});

exports[".vscode/settings.json"] = jsonc({
  "jsonc/sort-keys": [
    "error",
    {
      pathPattern: "^\\[.*\\]$",
      order: [
        "editor.formatOnSave",
        {
          order: {
            natural: true,
          },
        },
      ],
    },
    {
      pathPattern: ".*",
      order: {
        natural: true,
      },
    },
  ],
});

exports["json:default"] = json({
  "jsonc/sort-keys": [
    "error",
    {
      order: {
        natural: true,
      },
      pathPattern: ".*",
    },
  ],
});

exports["jsonc:default"] = jsonc({
  "jsonc/sort-keys": [
    "error",
    {
      order: {
        natural: true,
      },
      pathPattern: ".*",
    },
  ],
});

/**
 * @param {string} extend
 * @param {Linter.RulesRecord} rules
 * @returns {ESLint.ConfigData}
 */
function anyJson(extend, rules) {
  return {
    plugins: ["prettier"],
    extends: ["prettier", extend],
    parser: "jsonc-eslint-parser",

    rules: {
      "prettier/prettier": "error",
      ...rules,
    },
  };
}

/**
 * @param {Linter.RulesRecord} rules
 * @returns {ESLint.ConfigData}
 */
function json(rules) {
  return anyJson("plugin:jsonc/recommended-with-json", rules);
}

/**
 * @param {Linter.RulesRecord} rules
 * @returns {ESLint.ConfigData}
 */
function jsonc(rules) {
  return anyJson("plugin:jsonc/recommended-with-jsonc", rules);
}

/** @type {ESLint.ConfigData} */
exports.config = {};
