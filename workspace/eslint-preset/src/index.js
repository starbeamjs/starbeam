// @ts-nocheck
// Flat-config ESLint preset for the Starbeam monorepo.
//
// ts-nocheck: @types/eslint (used transitively) still reflects the ESLint 8
// legacy config shape; flat-config `name`/plugin-object fields trip the older
// types. Runtime shape is validated by ESLint itself.
//
// Vendored from @starbeam-dev/eslint-plugin@1.1.1. Intent is to extract this
// back to its own repo once stable. See README.md for background.

import eslintCommentsPlugin from "@eslint-community/eslint-plugin-eslint-comments";
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import commentLengthPlugin from "eslint-plugin-comment-length";
import importPlugin from "eslint-plugin-import";
import jsoncPlugin from "eslint-plugin-jsonc";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicornPlugin from "eslint-plugin-unicorn";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import globals from "globals";
import jsoncParser from "jsonc-eslint-parser";
import tseslint from "typescript-eslint";

import { BASE_NON_TYPED_RULES, buildTypedRules, TIGHT_RULES } from "./rules.js";

/** @typedef {import("eslint").Linter.Config} FlatConfig */

const DEFAULT_TS_FILES = ["**/*.ts", "**/*.mts", "**/*.cts", "**/*.tsx"];
const DEFAULT_JS_FILES = ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.jsx"];
const ALL_CODE_FILES = [...DEFAULT_TS_FILES, ...DEFAULT_JS_FILES];

/**
 * Shared plugins for JS/TS source. Registered at the plugin map level so
 * downstream configs can override rules without re-registering plugins.
 */
const CODE_PLUGINS = {
  "@typescript-eslint": tseslint.plugin,
  import: importPlugin,
  "simple-import-sort": simpleImportSort,
  "unused-imports": unusedImportsPlugin,
  unicorn: unicornPlugin,
  prettier: prettierPlugin,
  "@eslint-community/eslint-comments": eslintCommentsPlugin,
  "comment-length": commentLengthPlugin,
};

const IMPORT_SETTINGS = {
  "import/resolver": {
    typescript: { alwaysTryTypes: true },
  },
  "import/ignore": ["\\.js\\?script"],
};

/**
 * @param {{ files?: string[]; tsconfigRootDir?: string; projectService?: boolean; project?: string | string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function base(opts = {}) {
  const files = opts.files ?? DEFAULT_TS_FILES;
  const typedRules = buildTypedRules();
  return [
    {
      name: "@starbeam/base",
      files,
      plugins: CODE_PLUGINS,
      languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {
          ecmaVersion: "latest",
          // Prefer projectService (auto-discovers per-file tsconfig) unless
          // an explicit project was passed.
          ...(opts.project
            ? { project: opts.project }
            : { projectService: opts.projectService ?? true }),
          ...(opts.tsconfigRootDir
            ? { tsconfigRootDir: opts.tsconfigRootDir }
            : {}),
        },
        globals: { ...globals.node },
      },
      settings: IMPORT_SETTINGS,
      rules: {
        ...js.configs.recommended.rules,
        ...typedRules,
        ...BASE_NON_TYPED_RULES,
      },
    },
  ];
}

/**
 * `tight`: base + @typescript-eslint/strict + no-magic-numbers.
 * Applies to first-party package sources.
 *
 * @param {{ files?: string[]; tsconfigRootDir?: string; project?: string | string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function tight(opts = {}) {
  const files = opts.files ?? DEFAULT_TS_FILES;
  const strict = /** @type {FlatConfig[]} */ (tseslint.configs.strict);
  return [
    ...base(opts),
    // Apply the type-aware strict rules on top of base, scoped to the same
    // files.
    ...strict.map((cfg, idx) => ({
      ...cfg,
      name: `@starbeam/tight:ts-strict[${idx}]`,
      files,
    })),
    {
      name: "@starbeam/tight",
      files,
      rules: { ...TIGHT_RULES },
    },
  ];
}

/**
 * `loose`: base without the `@typescript-eslint/strict` addendum. Used for
 * test sources where `no-magic-numbers` and related strictness are noisy.
 *
 * @param {{ files?: string[]; tsconfigRootDir?: string; project?: string | string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function loose(opts = {}) {
  return base(opts);
}

/**
 * `typed-js`: applies the base config to JS files, with
 * `@typescript-eslint/explicit-module-boundary-types` turned off (the original
 * plugin's `typed-js` config). Tolerates `triple-slash-reference` in JS.
 *
 * @param {{ files?: string[]; tsconfigRootDir?: string; project?: string | string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function typedJs(opts = {}) {
  const files = opts.files ?? DEFAULT_JS_FILES;
  return [
    ...base({ ...opts, files }),
    {
      name: "@starbeam/typed-js",
      files,
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/triple-slash-reference": "off",
      },
    },
  ];
}

/**
 * `esm`: a slightly leaner version of base for rollup configs and other ESM
 * scripts. No `no-console`, no `eslint-comments` enforcement, fewer rules.
 *
 * @param {{ files?: string[]; tsconfigRootDir?: string; project?: string | string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function esm(opts = {}) {
  const files = opts.files ?? [...DEFAULT_JS_FILES, ...DEFAULT_TS_FILES];
  const typed = buildTypedRules();
  return [
    {
      name: "@starbeam/esm",
      files,
      plugins: CODE_PLUGINS,
      languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {
          ecmaVersion: "latest",
          ...(opts.project
            ? { project: opts.project }
            : { projectService: opts.projectService ?? true }),
          ...(opts.tsconfigRootDir
            ? { tsconfigRootDir: opts.tsconfigRootDir }
            : {}),
        },
        globals: { ...globals.node },
      },
      settings: IMPORT_SETTINGS,
      rules: {
        ...js.configs.recommended.rules,
        ...typed,
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-require-imports": "off",
        "unused-imports/no-unused-imports": "error",
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error",
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
    },
  ];
}

/**
 * `comments`: apply the `comment-length` plugin's recommended rules to all
 * code files. Split from `base` so consumers can opt in/out independently.
 *
 * @param {{ files?: string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function comments(opts = {}) {
  const files = opts.files ?? ALL_CODE_FILES;
  return [
    {
      name: "@starbeam/comments",
      files,
      plugins: { "comment-length": commentLengthPlugin },
      rules: {
        "comment-length/limit-single-line-comments": ["warn"],
        "comment-length/limit-multi-line-comments": ["warn"],
      },
    },
  ];
}

/**
 * Prettier compatibility: disables formatting rules that conflict with
 * Prettier. Apply last in the config stack.
 *
 * @returns {FlatConfig[]}
 */
export function prettier() {
  return [
    {
      name: "@starbeam/prettier",
      files: ALL_CODE_FILES,
      rules: { ...prettierConfig.rules },
    },
  ];
}

// ---- JSON/JSONC -------------------------------------------------------------

/**
 * Language block: parse `*.json` / `*.jsonc` with `jsonc-eslint-parser`.
 *
 * @returns {FlatConfig}
 */
function jsonLanguage() {
  return {
    name: "@starbeam/json:parser",
    files: ["**/*.json", "**/*.jsonc"],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc: jsoncPlugin,
    },
  };
}

/**
 * Flat-config equivalent of the original plugin's `json:default` and
 * `jsonc:default`: natural-order sort-keys for arbitrary JSON/JSONC.
 *
 * @returns {FlatConfig[]}
 */
export function jsonDefault() {
  return [
    jsonLanguage(),
    // Regular JSON: comments forbidden (jsonc/no-comments enabled)
    ...jsoncPlugin.configs["flat/recommended-with-json"],
    // JSONC/JSON5: comments allowed; scope the recommended config narrowly.
    ...jsoncPlugin.configs["flat/recommended-with-jsonc"].map((cfg) => ({
      ...cfg,
      files: [
        "**/*.jsonc",
        "**/tsconfig.json",
        "**/tsconfig.*.json",
        "**/.vscode/*.json",
        "**/turbo.json",
      ],
    })),
    // For the subset of .json that are actually JSONC (VS Code, tsconfig,
    // turbo), explicitly allow comments.
    {
      name: "@starbeam/json:allow-comments",
      files: [
        "**/*.jsonc",
        "**/tsconfig.json",
        "**/tsconfig.*.json",
        "**/.vscode/*.json",
        "**/turbo.json",
      ],
      rules: {
        "jsonc/no-comments": "off",
      },
    },
    {
      name: "@starbeam/json:default",
      files: ["**/*.json", "**/*.jsonc"],
      rules: {
        "jsonc/sort-keys": [
          "error",
          {
            order: { natural: true },
            pathPattern: ".*",
          },
        ],
      },
    },
  ];
}

/**
 * Package.json ordering: the specific key order used by Starbeam.
 *
 * @returns {FlatConfig[]}
 */
export function packageJson() {
  return [
    {
      name: "@starbeam/json:package",
      files: ["**/package.json"],
      languageOptions: { parser: jsoncParser },
      plugins: { jsonc: jsoncPlugin },
      rules: {
        ...jsoncPlugin.configs["flat/recommended-with-json"].reduce(
          (acc, cfg) => ({ ...acc, ...(cfg.rules ?? {}) }),
          /** @type {Record<string, unknown>} */ ({}),
        ),
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
              "type",
              "version",
              "description",
              "license",
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
      },
    },
  ];
}

/**
 * tsconfig.json ordering: compilerOptions in a specific documented order.
 *
 * @returns {FlatConfig[]}
 */
export function tsconfigJson() {
  return [
    {
      name: "@starbeam/json:tsconfig",
      files: ["**/tsconfig.json", "**/tsconfig.*.json"],
      languageOptions: { parser: jsoncParser },
      plugins: { jsonc: jsoncPlugin },
      rules: {
        ...jsoncPlugin.configs["flat/recommended-with-jsonc"].reduce(
          (acc, cfg) => ({ ...acc, ...(cfg.rules ?? {}) }),
          /** @type {Record<string, unknown>} */ ({}),
        ),
        "jsonc/sort-keys": [
          "error",
          {
            pathPattern: "^$",
            order: [
              "extends",
              "compilerOptions",
              "files",
              "include",
              "exclude",
              "references",
              "watchOptions",
              "typeAcquisition",
            ],
          },
          {
            pathPattern: "^compilerOptions$",
            order: [
              "composite",
              "disableReferencedProjectLoad",
              "disableSolutionSearching",
              "disableSourceOfProjectReferenceRedirect",
              "tsBuildInfoFile",
              "noEmitOnError",
              "incremental",
              "skipLibCheck",
              "skipDefaultLibCheck",
              "target",
              "module",
              "moduleResolution",
              "lib",
              "moduleDetection",
              "noLib",
              "useDefineForClassFields",
              "allowJs",
              "checkJs",
              "maxNodeModuleJsDepth",
              "emitDecoratorMetadata",
              "experimentalDecorators",
              "jsx",
              "jsxImportSource",
              "jsxFactory",
              "jsxFragmentFactory",
              "allowSyntheticDefaultImports",
              "esModuleInterop",
              "isolatedModules",
              "forceConsistentCasingInFileNames",
              "preserveSymlinks",
              "paths",
              "rootDir",
              "rootDirs",
              "types",
              "typeRoots",
              "preserveConstEnums",
              "removeComments",
              "stripInternal",
              "strict",
              "exactOptionalPropertyTypes",
              "noImplicitOverride",
              "noPropertyAccessFromIndexSignature",
              "noUncheckedIndexedAccess",
              "alwaysStrict",
              "strictNullChecks",
              "strictBindCallApply",
              "strictFunctionTypes",
              "strictPropertyInitialization",
              "noImplicitAny",
              "noImplicitThis",
              "useUnknownInCatchVariables",
              "moduleSuffixes",
              "allowArbitraryExtensions",
              "allowImportingTsExtensions",
              "customConditions",
              "noResolve",
              "resolveJsonModule",
              "resolvePackageJsonImports",
              "importsNotUsedAsValues",
              "noEmit",
              "importHelpers",
              "sourceMap",
              "inlineSources",
              "inlineSourceMap",
              "sourceRoot",
              "mapRoot",
              "declaration",
              "declarationDir",
              "declarationMap",
              "emitDeclarationOnly",
              "outDir",
              "downlevelIteration",
              "emitBOM",
              "newLine",
              "noEmitHelpers",
              "outFile",
              "plugins",
              "disableSizeLimit",
              "diagnostics",
              "listFiles",
              "listEmittedFiles",
              "explainFiles",
              "traceResolution",
              "extendedDiagnostics",
              "generateCpuProfile",
            ],
          },
          {
            pathPattern: ".*",
            order: { type: "asc", natural: true },
          },
        ],
      },
    },
  ];
}

/**
 * VS Code settings.json ordering: section groups first, natural order within.
 *
 * @returns {FlatConfig[]}
 */
export function vscodeSettingsJson() {
  return [
    {
      name: "@starbeam/json:vscode-settings",
      files: ["**/.vscode/settings.json"],
      languageOptions: { parser: jsoncParser },
      plugins: { jsonc: jsoncPlugin },
      rules: {
        ...jsoncPlugin.configs["flat/recommended-with-jsonc"].reduce(
          (acc, cfg) => ({ ...acc, ...(cfg.rules ?? {}) }),
          /** @type {Record<string, unknown>} */ ({}),
        ),
        "jsonc/sort-keys": [
          "error",
          {
            pathPattern: "^\\[.*\\]$",
            order: [
              "editor.formatOnSave",
              { order: { natural: true } },
            ],
          },
          {
            pathPattern: ".*",
            order: { natural: true },
          },
        ],
      },
    },
  ];
}

/**
 * `jsonRecommended` bundles the JSON-related configs in the order the original
 * plugin's `json:recommended` applied them (most-specific last).
 *
 * @returns {FlatConfig[]}
 */
export function jsonRecommended() {
  return [
    ...jsonDefault(),
    ...packageJson(),
    ...tsconfigJson(),
    ...vscodeSettingsJson(),
  ];
}

// ---- Package-level presets --------------------------------------------------

/**
 * `libraryRecommended`: equivalent of the original plugin's
 * `library:recommended` config. For first-party package sources.
 *
 * Applies:
 *   - `comments` to all code files
 *   - `typedJs` to JS files
 *   - `tight` to TS files
 *
 * With no arguments, uses projectService for per-file tsconfig auto-discovery.
 * Pass `project` / `tsconfigRootDir` to override.
 *
 * @param {{ tsconfigRootDir?: string; project?: string | string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function libraryRecommended(opts = {}) {
  return [
    ...comments(),
    ...typedJs({ files: DEFAULT_JS_FILES, ...opts }),
    ...tight({ files: DEFAULT_TS_FILES, ...opts }),
  ];
}

/**
 * `testsRecommended`: equivalent of the original plugin's `tests:recommended`.
 * Like `libraryRecommended` but uses `loose` on TS (no strict/magic-numbers).
 *
 * @param {{ tsconfigRootDir?: string; project?: string | string[] }} [opts]
 * @returns {FlatConfig[]}
 */
export function testsRecommended(opts = {}) {
  return [
    ...comments(),
    ...typedJs({ files: DEFAULT_JS_FILES, ...opts }),
    ...loose({ files: DEFAULT_TS_FILES, ...opts }),
  ];
}

export const files = {
  ts: DEFAULT_TS_FILES,
  js: DEFAULT_JS_FILES,
  code: ALL_CODE_FILES,
};
