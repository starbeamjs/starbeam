import { isSingleItemArray } from "@starbeam/core-utils";
import type { JsonObject } from "@starbeam-workspace/json";
import type { Package } from "@starbeam-workspace/package";
import type { ESLint } from "eslint";

import type { LabelledUpdater } from "./update-package.js";
import { UpdatePackageFn } from "./updates.js";

type ConfigOverride = NonNullable<ESLint.ConfigData["overrides"]>[number];

export const updateEslint = {
  demo: UpdatePackageFn((updater) => {
    updater.json(".eslintrc.json", () => {
      return {
        root: false,

        overrides: [
          localEslintConfig(updater),
          localEslintConfig(updater, {
            files: ["vite.config.ts"],
            extend: "@starbeam/loose",
          }),
        ],
      };
    });
  }),

  package: UpdatePackageFn((update) => {
    update.json(".eslintrc.json", () => {
      return {
        root: false,
        overrides: [localEslintConfig(update)],
      };
    });
  }),
} as const;

function eslintPlugin(pkg: Package): `@starbeam/${string}` {
  if (pkg.moduleType === "cjs") {
    return "@starbeam/commonjs";
  } else if (pkg.starbeam.source.isJS) {
    return "@starbeam/esm";
  } else if (pkg.starbeam.type.is("tests")) {
    return "@starbeam/loose";
  } else if (pkg.starbeam.type.isType("demo")) {
    return "@starbeam/demos";
  } else {
    return "@starbeam/tight";
  }
}

function eslintFiles(pkg: Package): string[] {
  const tsconfig = pkg.tsconfigJSON();
  const tsconfigIncludes = tsconfig?.includes;

  if (isSingleItemArray(tsconfigIncludes)) {
    const [includes] = tsconfigIncludes;

    if (includes !== "**/*") {
      return [includes];
    }
  }

  const ext = pkg.source.inputExtensions;

  if (pkg.type.isType("library") || pkg.type.isType("demo")) {
    return ext.flatMap((e) => [`index.${e}`, `src/**/*.${e}`]);
  } else {
    return ext.flatMap((e) => [`**/*.${e}`]);
  }
}

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
  } = {}
): ConfigOverride & JsonObject {
  return {
    parserOptions: {
      project: path(pkg.root.file(tsconfig)).fromWorkspaceRoot(),
    },
    files,
    extends: [`plugin:${extend}`],
  };
}
