import type { Package } from "@starbeam-workspace/package";
import type { ESLint } from "eslint";
import type { JsonObject } from "typed-json-utils";

import type { LabelledUpdater } from "../updating/update-file.js";
import { UpdatePackageFn } from "./updates.js";

type ConfigOverride = NonNullable<ESLint.ConfigData["overrides"]>[number];

const BASE = {
  root: true,
  extends: ["plugin:@starbeam-dev/library:recommended"],
};

export const updateEslintrc = UpdatePackageFn((updater, options) => {
  const pkg = updater.pkg;

  if (pkg.type.hasCategory("demo")) {
    DEMO(updater, options);
  } else {
    PACKAGE(updater, options);
  }
});

const DEMO = UpdatePackageFn((updater) => {
  updater.json(".eslintrc.json", () => {
    return {
      ...BASE,
      overrides: [
        localEslintConfig(updater),
        localEslintConfig(updater, {
          files: ["vite.config.ts"],
          extend: "@starbeam-dev/loose",
        }),
        JSON_ESLINT_CONFIG,
      ],
    };
  });
});

const PACKAGE = UpdatePackageFn((update) => {
  update.json(".eslintrc.json", () => {
    return BASE;
  });
});

function eslintPlugin(pkg: Package): `@starbeam-dev/${string}` {
  if (pkg.moduleType === "cjs") {
    return "@starbeam-dev/commonjs";
  } else if (pkg.starbeam.source.isOnlyJS) {
    return "@starbeam-dev/esm";
  } else if (pkg.starbeam.type.is("tests")) {
    return "@starbeam-dev/loose";
  } else if (pkg.starbeam.type.hasCategory("demo")) {
    return "@starbeam-dev/demos";
  } else {
    return "@starbeam-dev/tight";
  }
}

function eslintFiles(pkg: Package): string[] {
  return [...pkg.sourceFiles].map((glob) => glob.toGlobString("relative"));
}

const JSON_ESLINT_CONFIG = {
  extends: ["plugin:@starbeam-dev/json:recommended"],
  files: ["*.json"],
};

function localEslintConfig(
  { path, pkg }: LabelledUpdater,
  {
    extend = eslintPlugin(pkg),
    tsconfig = "tsconfig.json",
    files = eslintFiles(pkg),
  }: {
    extend?: `@starbeam-dev/${string}`;
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
