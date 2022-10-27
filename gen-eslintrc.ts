import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { typescript } from "./.config/eslint/shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const universal = typescript(
  resolve(__dirname, "packages", "tsconfig.packages.json"),
  {
    files: [
      "./packages/universal/*/index.ts",
      "./packages/universal/*/src/**/*.{d.,}ts",
    ],
    tight: true,
  }
);

import { writeFileSync } from "node:fs";

writeFileSync(
  ".eslintrc.json",
  JSON.stringify(
    {
      rules: {},
      settings: {
        "import/resolver": {
          typescript: {},
        },
        "import/ignore": ["\\.js\\?script"],
      },
      ignorePatterns: [
        "packages/x/devtools-extension",
      ],
      overrides: [universal],
    },
    null,
    2
  )
);
