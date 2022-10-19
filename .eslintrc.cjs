// @ts-check

const { rules: shared, typescript } = require("./.eslint.shared.cjs");

/**
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  settings: {
    "import/resolver": {
      typescript: {},
    },
    "import/ignore": ["\\.js\\?script"],
  },
  ignorePatterns: ["packages/x/devtools-extension"],
  overrides: [
    {
      ...shared,
      files: ["./.eslintrc.cjs", "./.eslint.shared.cjs"],
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "script",
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off",
      },
    },
    typescript("./packages/tsconfig.packages.json", {
      files: ["./packages/*/*/**/*.{d.,}ts", "./packages/env.d.ts"],
      excludedFiles: [
        "packages/x/devtool/**",
        "packages/x/devtools-extension/**",
      ],
    }),
    typescript("./@types/tsconfig.json", {
      files: ["./@types/**/*.ts"],
    }),
    typescript("./packages/x/devtool/tsconfig.json", {
      files: ["./packages/x/devtool/**/*.ts{x,}"],
    }),
    typescript("./demos/tsconfig.react-demos.json", {
      files: ["./demos/react*/**/*.ts{x,}"],
      excludedFiles: ["./demos/*/vite.config.ts"],
    }),
    typescript("./demos/tsconfig.preact-demos.json", {
      files: ["./demos/preact*/**/*.ts{x,}"],
      excludedFiles: ["./demos/*/vite.config.ts"],
    }),
    typescript("./scripts/tsconfig.json", {
      files: ["./scripts/**/*.ts"],
    }),
    typescript("./packages/tsconfig.rollup.json", {
      files: ["./packages/*/*/rollup.config.mjs", "./demos/*/vite.config.ts"],
    }),
    typescript("./demos/tsconfig.vite.json", {
      files: ["./demos/*/vite.config.ts"],
    }),
    typescript("./.build/tsconfig.json", {
      files: ["./.build/**/*.{js,d.ts}"],
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "error",
      },
    }),
    typescript("./tsconfig.root.json", {
      files: ["./rollup.config.mjs"],
    }),
  ],
};
