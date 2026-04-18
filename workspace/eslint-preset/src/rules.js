// @ts-nocheck
// Helpers for building typescript-eslint rule sets, mirroring the semantics of
// the original @starbeam-dev/eslint-plugin `Rules` builder.

/**
 * @param {Record<string, import("eslint").Linter.RuleEntry>} target
 * @param {string | string[]} rule
 * @param {import("eslint").Linter.RuleEntry | Record<string, unknown>} entry
 */
function addTyped(target, rule, entry = "error") {
  if (Array.isArray(rule)) {
    for (const r of rule) addTyped(target, r, entry);
    return;
  }
  if (Array.isArray(entry) || typeof entry === "string") {
    target[`@typescript-eslint/${rule}`] = entry;
  } else {
    target[`@typescript-eslint/${rule}`] = ["error", entry];
  }
}

/**
 * @param {Record<string, import("eslint").Linter.RuleEntry>} target
 * @param {string | string[]} rule
 * @param {import("eslint").Linter.RuleEntry | Record<string, unknown>} entry
 */
function replace(target, rule, entry = "error") {
  if (Array.isArray(rule)) {
    for (const r of rule) replace(target, r, entry);
    return;
  }
  target[rule] = "off";
  if (Array.isArray(entry) || typeof entry === "string") {
    target[`@typescript-eslint/${rule}`] = entry;
  } else {
    target[`@typescript-eslint/${rule}`] = ["error", entry];
  }
}

/**
 * @param {Record<string, import("eslint").Linter.RuleEntry>} target
 * @param {{ untyped?: string[]; typed?: string[]; both?: string[] }} rules
 */
function disable(target, { untyped, typed, both }) {
  for (const r of untyped ?? []) target[r] = "off";
  for (const r of both ?? []) target[r] = "off";
  for (const r of typed ?? []) target[`@typescript-eslint/${r}`] = "off";
  for (const r of both ?? []) target[`@typescript-eslint/${r}`] = "off";
}

/** @returns {Record<string, import("eslint").Linter.RuleEntry>} */
export function buildTypedRules() {
  /** @type {Record<string, import("eslint").Linter.RuleEntry>} */
  const rules = {};

  disable(rules, {
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
  });

  replace(rules, [
    "default-param-last",
    "no-dupe-class-members",
    "no-invalid-this",
    "no-loop-func",
  ]);
  replace(rules, "dot-notation", {
    allowIndexSignaturePropertyAccess: true,
  });

  addTyped(rules, [
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
  ]);
  addTyped(rules, "no-confusing-void-expression", { ignoreVoidOperator: true });
  addTyped(rules, "require-array-sort-compare", { ignoreStringArrays: true });
  addTyped(rules, "explicit-function-return-type", {
    allowExpressions: true,
    allowTypedFunctionExpressions: true,
    allowDirectConstAssertionInArrowFunctions: true,
    allowFunctionsWithoutTypeParameters: true,
    allowHigherOrderFunctions: true,
  });
  addTyped(rules, "explicit-member-accessibility", {
    accessibility: "no-public",
  });
  addTyped(rules, "no-restricted-imports", {
    paths: [
      {
        name: "@starbeam/core",
        message: "Please use @starbeam/universal instead of @starbeam/core.",
      },
    ],
  });
  addTyped(rules, "no-extraneous-class", { allowEmpty: true });
  addTyped(rules, "no-import-type-side-effects");
  addTyped(rules, "consistent-type-imports", {
    disallowTypeAnnotations: false,
    fixStyle: "separate-type-imports",
  });
  addTyped(rules, "parameter-properties", { allow: ["readonly"] });
  addTyped(rules, "consistent-type-definitions", "error");
  addTyped(rules, "no-unsafe-argument", "warn");
  addTyped(rules, "no-unsafe-assignment", "warn");
  addTyped(rules, "no-unsafe-call", "warn");
  addTyped(rules, "no-unsafe-declaration-merging", "warn");
  addTyped(rules, "no-unsafe-member-access", "warn");
  addTyped(rules, "no-unsafe-return", "warn");

  return rules;
}

/** Base non-typed rules shared across configs. */
export const BASE_NON_TYPED_RULES = {
  "no-console": "error",
  "@eslint-community/eslint-comments/no-unused-disable": "error",
  "@eslint-community/eslint-comments/require-description": [
    "off",
    { ignore: ["eslint-enable"] },
  ],
  "@eslint-community/eslint-comments/disable-enable-pair": [
    "error",
    { allowWholeFile: true },
  ],
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
  "import/no-unresolved": "off",
  "import/no-relative-packages": "error",
  "import/first": "error",
  "import/newline-after-import": "error",
  "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
  "import/no-duplicates": "error",
  "unicorn/prefer-node-protocol": "error",
};

/** The `tight` addendum: strict + no-magic-numbers. */
export const TIGHT_RULES = {
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
