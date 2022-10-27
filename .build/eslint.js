/// <reference path="./plugins.d.ts" />

import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, "..");

/** @type {import("eslint").Linter.RulesRecord} */
const ORDERING = {
  // "@typescript-eslint/member-ordering": [
  //   "error",
  //   {
  //     classes: {
  //       order: "natural",
  //       memberTypes: [
  //         // Index signature
  //         "signature",
  //         // Fields
  //         "public-instance-field",
  //         "private-instance-field",
  //         "abstract-field",
  //         ["public-abstract-get", "public-abstract-set"],
  //         ["protected-abstract-get", "protected-abstract-set"],
  //         // Static initialization
  //         "static-initialization",
  //         "static-field",
  //         ["static-get", "static-set"],
  //         "static-method",
  //         "decorated-field",
  //         // Constructors
  //         "constructor",
  //         // Getters and Setters at the same rank
  //         ["public-instance-get", "public-instance-set"],
  //         ["protected-instance-get", "protected-instance-set"],
  //         ["private-instance-get", "private-instance-set"],
  //         // Methods
  //         "method",
  //       ],
  //     },
  //   },
  // ],
};

import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import prettier from "eslint-plugin-prettier";
import eslintRecommended from "eslint";
import * as tsParser from "@typescript-eslint/parser";
import ts from "@typescript-eslint/eslint-plugin";

// /**
//  * @type {import("./eslint-flat.js").FlatConfigItem[]}
//  */
// export const EXTENDS = [
//   "plugin:import/recommended",
//   "plugin:import/typescript",
//   "prettier",
//   "plugin:prettier/recommended",
//   "plugin:@typescript-eslint/recommended",
//   "plugin:@typescript-eslint/recommended-requiring-type-checking",
//   "plugin:@typescript-eslint/strict",
//   "plugin:json/recommended",
// ];

/** @typedef {import("eslint").Linter.RulesRecord} RulesRecord */
/** @typedef {{ rules: RulesRecord, plugins?: string[] | PluginRecord }} PluginInput */
/** @typedef {{ rules: RulesRecord, plugins?: PluginRecord }} PluginOutput */
/** @typedef {Record<string, object>} PluginRecord */

/** @type {import("eslint").Linter.RulesRecord} */
export const BASE_RULES = {
  "@typescript-eslint/no-invalid-void-type": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "init-declarations": "off",
  "@typescript-eslint/init-declarations": "off",

  "@typescript-eslint/explicit-module-boundary-types": "error",
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/prefer-readonly": "error",
  "@typescript-eslint/consistent-type-exports": "error",
  "@typescript-eslint/consistent-indexed-object-style": "error",
  "@typescript-eslint/consistent-generic-constructors": "error",
  "@typescript-eslint/method-signature-style": "error",
  "@typescript-eslint/no-confusing-void-expression": "error",
  "@typescript-eslint/no-redundant-type-constituents": "error",
  "@typescript-eslint/no-unnecessary-qualifier": "error",
  "@typescript-eslint/no-useless-empty-export": "error",
  "@typescript-eslint/prefer-enum-initializers": "error",
  "@typescript-eslint/prefer-regexp-exec": "error",
  "@typescript-eslint/promise-function-async": "error",
  "@typescript-eslint/require-array-sort-compare": [
    "error",
    { ignoreStringArrays: true },
  ],

  "@typescript-eslint/explicit-function-return-type": [
    "warn",
    {
      allowExpressions: true,
      allowHigherOrderFunctions: false,
    },
  ],

  "import/no-relative-packages": "error",
  "import/no-duplicates": "error",

  "unused-imports/no-unused-imports": "error",
  "simple-import-sort/imports": "error",
  "simple-import-sort/exports": "error",

  "default-param-last": "off",
  "@typescript-eslint/default-param-last": "error",

  "no-dupe-class-members": "off",
  "@typescript-eslint/no-dupe-class-members": "error",

  "dot-notation": "off",
  "@typescript-eslint/dot-notation": "error",

  "no-invalid-this": "off",
  "@typescript-eslint/no-invalid-this": "error",

  "no-loop-func": "off",
  "@typescript-eslint/no-loop-func": "error",

  "@typescript-eslint/explicit-member-accessibility": [
    "error",
    { accessibility: "no-public" },
  ],

  "@typescript-eslint/no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "@starbeam/core",
          message: "Please use @starbeam/universal.",
        },
      ],
    },
  ],

  "@typescript-eslint/no-extraneous-class": [
    "error",
    {
      allowEmpty: true,
    },
  ],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      disallowTypeAnnotations: false,
    },
  ],
  "@typescript-eslint/parameter-properties": [
    "error",
    {
      allow: "public readonly",
    },
  ],

  "@typescript-eslint/no-type-alias": [
    "warn",
    {
      allowAliases: "always",
      allowCallbacks: "always",
      allowConditionalTypes: "always",
      allowConstructors: "always",
      allowLiterals: "in-unions",
      allowMappedTypes: "always",
      allowTupleTypes: "always",
      allowGenerics: "always",
    },
  ],

  "unused-imports/no-unused-vars": [
    "warn",
    {
      vars: "all",
      varsIgnorePattern: "^_",
      args: "after-used",
      argsIgnorePattern: "^_",
    },
  ],
};

/** @type {import("eslint").Linter.RulesRecord} */
const SHADOW = {
  "no-shadow": "off",
  "@typescript-eslint/no-shadow": "error",
};

/** @type {import("eslint").Linter.RulesRecord} */
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

/** @type {import("eslint").Linter.RulesRecord} */
export const STRICT_RULES = {
  ...BASE_RULES,
  ...ORDERING,
  ...MAGIC_NUMBERS,
  ...SHADOW,
};

import pluginImportRecommended from "eslint-plugin-import/config/recommended.js";
import pluginImportTypescript from "eslint-plugin-import/config/typescript.js";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param {string} root
 * @param {string} tsconfigPath
 * @param {import("./eslint.js").TypescriptConfig} config
 * @returns {import("./eslint-flat.js").FlatConfigItem[]}
 */
export function lintTypescript(root, tsconfigPath, config) {
  const files = filesConfig(config);
  const ts = config?.ts;

  const languageOptions = {
    languageOptions: {
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: tsconfigPath,
      },
    },
  };

  const settings = {
    "import/resolver": {
      typescript: {},
    },
    "import/ignore": ["\\.js\\?script"],
  };

  /** @type {import("eslint").Linter.RulesRecord} */
  const configRules = (config.rules ||= {});

  if (ts) {
    for (const [key, value] of Object.entries(ts)) {
      configRules[`@typescript-eslint/${key}`] = value;
    }
  }

  delete config?.ts;

  const base = config?.tight ? STRICT_RULES : BASE_RULES;
  delete config?.tight;

  const allRules = {
    rules: {
      ...base,
      ...configRules,
    },
    ...languageOptions,
    ...files,
  };

  const compat = new FlatCompat({
    baseDirectory: resolve(__dirname, ".."),
    resolvePluginsRelativeTo: __dirname,
  });

  const plugins = compat.plugins(
    "import",
    "unused-imports",
    "simple-import-sort",
    "prettier",
    "@typescript-eslint"
  );

  const extendsRules = compat
    .extends(
      "plugin:import/recommended",
      "plugin:import/typescript",
      "prettier",
      "plugin:prettier/recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
      "plugin:@typescript-eslint/strict",
      "plugin:json/recommended"
    )
    .map((item) => {
      return "rules" in item
        ? { ...item, ...files, ...languageOptions, settings }
        : item;
    });

  // languageOptions: {
  //   sourceType: "module",
  //   parser: tsParser,
  //   parserOptions: {
  //     project: tsconfigPath,
  //   },
  // },

  return [
    ...plugins,
    {
      languageOptions: {
        sourceType: "module",
        parser: tsParser,
        parserOptions: {
          project: tsconfigPath,
        },
      },
      ...files,
    },
    ...extendsRules,
    allRules,
  ];
}

/**
 * @param {import("./eslint.js").TypescriptConfig} config
 */
function filesConfig(config) {
  /**
   * @type {{files: string[], ignores?: string[]}}
   */
  const files = {
    files: config.files.map((f) => relative(workspaceRoot, f)),
  };

  if (config.ignores) {
    files.ignores = config.ignores.map((f) => relative(workspaceRoot, f));
  }

  return files;
}

/**
 * @template T
 * @param {T | T[]} value
 * @returns {T[]}
 */
function wrap(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}
