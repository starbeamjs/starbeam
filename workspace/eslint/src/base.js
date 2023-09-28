// eslint-disable-next-line unused-imports/no-unused-vars
const { Linter, ESLint } = require("eslint");
const Rules = require("./rules.js");

/** @type {ESLint.ConfigData} */
exports.config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // EXPERIMENTAL_useSourceOfProjectReferenceRedirect: true,
    ecmaVersion: "latest",
  },
  settings: {
    "import/resolver": {
      typescript: {},
    },
    "import/ignore": ["\\.js\\?script"],
  },
  plugins: [
    "import",
    "unused-imports",
    "simple-import-sort",
    "prettier",
    "@typescript-eslint",
    "json",
  ],
};

exports.extends = [
  "eslint:recommended",
  "plugin:@typescript-eslint/recommended",
  "plugin:@typescript-eslint/recommended-requiring-type-checking",
  "plugin:import/errors",
  "plugin:json/recommended",
  "plugin:eslint-comments/recommended",
  "prettier",
];

const TYPED_RULES = Rules.build((rules) =>
  rules
    .disable({
      untyped: [
        "no-fallthrough",
        "default-param-last",
        "no-dupe-class-members",
        "no-constant-condition",
        "no-inner-declarations",
        "import/namespace",
      ],
      typed: [
        "no-invalid-void-type",
        "no-unused-vars",
        "no-dynamic-delete",
        "no-meaningless-void-operator",
      ],
      both: ["init-declarations", "no-undef"],
    })

    .replace([
      "default-param-last",
      "no-dupe-class-members",
      "no-invalid-this",
      "no-loop-func",
    ])
    .replace("dot-notation", {
      allowIndexSignaturePropertyAccess: true,
    })
    .typed([
      "explicit-module-boundary-types",
      "no-floating-promises",
      "prefer-readonly",
      "consistent-type-exports",
      "consistent-indexed-object-style",
      "consistent-generic-constructors",
      "method-signature-style",
      "no-redundant-type-constituents",
      "no-unnecessary-qualifier",
      "no-useless-empty-export",
      "prefer-enum-initializers",
      "prefer-regexp-exec",
      "promise-function-async",
    ])
    .typed("no-confusing-void-expression", {
      ignoreVoidOperator: true,
    })
    .typed("require-array-sort-compare", {
      ignoreStringArrays: true,
    })
    .typed("explicit-function-return-type", {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowDirectConstAssertionInArrowFunctions: true,
      allowFunctionsWithoutTypeParameters: true,
      allowHigherOrderFunctions: true,
    })
    .typed("explicit-member-accessibility", {
      accessibility: "no-public",
    })
    .typed("no-restricted-imports", {
      paths: [
        {
          name: "@starbeam/core",
          message: "Please use @starbeam/universal instead of @starbeam/core.",
        },
      ],
    })
    .typed("no-extraneous-class", {
      allowEmpty: true,
    })
    .typed("consistent-type-imports", {
      disallowTypeAnnotations: false,
    })
    .typed("parameter-properties", {
      allow: ["readonly"],
    })
    .typed("no-type-alias", [
      "error",
      {
        allowAliases: "always",
        allowCallbacks: "always",
        allowConditionalTypes: "always",
        allowConstructors: "always",
        allowLiterals: "in-unions-and-intersections",
        allowMappedTypes: "always",
        allowTupleTypes: "always",
        allowGenerics: "always",
      },
    ])
    .typed("no-unsafe-argument", "warn")
    .typed("no-unsafe-assignment", "warn")
    .typed("no-unsafe-call", "warn")
    .typed("no-unsafe-declaration-merging", "warn")
    .typed("no-unsafe-member-access", "warn")
    .typed("no-unsafe-return", "warn"),
);

/** @type {Linter.RulesRecord} */
exports.rules = {
  ...TYPED_RULES,
  "eslint-comments/no-unused-disable": "error",
  "eslint-comments/require-description": [
    "off", // enable in a subsequent PR
    { ignore: ["eslint-enable"] },
  ],
  "eslint-comments/disable-enable-pair": ["error", { allowWholeFile: true }],
  "unused-imports/no-unused-imports": "error",
  "simple-import-sort/imports": "error",
  "simple-import-sort/exports": "error",
  "no-unused-private-class-members": "error",
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
  "import/first": "error",
  "import/newline-after-import": "error",
  "import/no-duplicates": "error",
};
