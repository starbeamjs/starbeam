// Flat-config ESLint configuration for the Starbeam monorepo.
//
// Replaces the 65 .eslintrc.json files that were previously scattered
// across the workspace. Consumes @starbeam-workspace/eslint-preset, which is
// vendored from @starbeam-dev/eslint-plugin@1.1.1 and adapted for ESLint 9
// flat config.
//
// The preset auto-discovers per-file tsconfig via
// parserOptions.projectService, so no per-package config plumbing is needed
// for TypeScript projects to be linted correctly.
//
// Pre-migration, every package's .eslintrc.json was essentially just
// `{ extends: ["plugin:@starbeam-dev/library:recommended"] }`, including
// `tests/` subdirs. This config preserves that uniformity.

import {
  esm as esmConfig,
  jsonRecommended,
  libraryRecommended,
  prettier,
  tight,
} from "@starbeam-workspace/eslint-preset";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.d.ts",
      "**/coverage/**",
      "**/.turbo/**",
      ".logs/**",
      "docs/**",

      // Benchmarks use JSX and decorators that require Babel-specific
      // parser config not part of the shared preset. Not published; not
      // worth the eslint plumbing.
      "packages/x/vanilla/bench/**",
    ],
  },

  ...libraryRecommended({
    files: [
      "packages/**/*.ts",
      "packages/**/*.tsx",
      "workspace/**/*.ts",
      "workspace/**/*.mts",
      "@types/**/*.ts",
    ],
  }),

  ...esmConfig({ files: ["**/rollup.config.{mjs,js}"] }),

  ...tight({ files: ["vitest.*.{mts,ts}"] }),

  ...jsonRecommended(),

  ...prettier(),

  {
    name: "@starbeam/overrides:types-shell-escape-tag",
    files: ["@types/shell-escape-tag/**/*.ts"],
    rules: { "@typescript-eslint/prefer-readonly": "off" },
  },

  {
    name: "@starbeam/overrides:debug-tests",
    files: ["packages/universal/debug/tests/**/*.ts"],
    rules: { "@typescript-eslint/prefer-readonly": "off" },
  },

  // Tests: soften type-aware unsafe-* rules. They were "warn" in the old
  // preset but `--max-warnings 0` in per-package test:lint scripts makes
  // them fail. projectService now surfaces these warnings where the old
  // setup didn't.
  //
  // `no-useless-assignment` (ESLint 10 recommended) also gets disabled in
  // tests: the `x = initial; ...; expect(x).toBe(y); x = initial;` pattern
  // is common for reset-between-assertions and is only "useless" from a
  // dataflow perspective.
  {
    name: "@starbeam/overrides:tests-unsafe",
    files: ["**/tests/**/*.ts", "**/tests/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
      "no-useless-assignment": "off",
    },
  },
];
