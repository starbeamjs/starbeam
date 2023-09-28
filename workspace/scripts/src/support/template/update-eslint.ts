import type { JsonObject } from "@starbeam-workspace/json";
import type { Package } from "@starbeam-workspace/package";
import type { ESLint } from "eslint";

import type { LabelledUpdater } from "../updating/update-file.js";
import { UpdatePackageFn } from "./updates.js";

type ConfigOverride = NonNullable<ESLint.ConfigData["overrides"]>[number];

export const updateEslint = {
  demo: UpdatePackageFn((updater) => {
    updater.json(".eslintrc.json", () => {
      return {
        root: true,
        plugins: ["@starbeam"],

        overrides: [
          localEslintConfig(updater),
          localEslintConfig(updater, {
            files: ["vite.config.ts"],
            extend: "@starbeam/loose",
          }),
          JSON_ESLINT_CONFIG,
        ],
      };
    });
  }),

  package: UpdatePackageFn((update) => {
    update.json(".eslintrc.json", () => {
      return {
        root: true,
        ignorePatterns: ["node_modules", "dist", "html", "tests"],
        plugins: ["@starbeam"],
        overrides: [localEslintConfig(update), JSON_ESLINT_CONFIG],
      };
    });
  }),
} as const;

function eslintPlugin(pkg: Package): `@starbeam/${string}` {
  if (pkg.moduleType === "cjs") {
    return "@starbeam/commonjs";
  } else if (pkg.starbeam.source.isOnlyJS) {
    return "@starbeam/esm";
  } else if (pkg.starbeam.type.is("tests")) {
    return "@starbeam/loose";
  } else if (pkg.starbeam.type.hasCategory("demo")) {
    return "@starbeam/demos";
  } else {
    return "@starbeam/tight";
  }
}

function eslintFiles(pkg: Package): string[] {
  return [...pkg.sourceFiles].map((glob) => glob.toGlobString("relative"));
}

const JSON_ESLINT_CONFIG = {
  extends: ["plugin:@starbeam/json:recommended"],
  files: ["*.json"],
};

function localEslintConfig(
  { path, pkg }: LabelledUpdater,
  {
    extend = eslintPlugin(pkg),
    tsconfig = "tsconfig.json",
    files = eslintFiles(pkg),
  }: {
    extend?: `@starbeam/${string}`;
    tsconfig?: string;
    files?: string | string[];
  } = {},
): ConfigOverride & JsonObject {
  return {
    files,
    extends: [`plugin:${extend}`],
    parserOptions: {
      project: path(pkg.root.file(tsconfig)).fromPackageRoot(),
    },
  };
}
