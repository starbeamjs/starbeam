import { isSingleItemArray } from "@starbeam/core-utils";
import type { Package } from "@starbeam-workspace/package";
import type { Paths } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";
import type { ESLint } from "eslint";

import { type JsonObject, type JsonValue, isObject } from "../json.js";
import type { LabelledUpdater } from "./update-package.js";

export type UpdatePackageFn = (
  updater: LabelledUpdater,
  options: { workspace: Workspace; paths: Paths }
) => void;

export function UpdatePackageFn(updater: UpdatePackageFn): UpdatePackageFn {
  return updater;
}

export const updateReactDemo = UpdatePackageFn((updater) =>
  updater.template("vite.config.ts")
);

export function updatePackageJSON(updater: LabelledUpdater): void {
  const { pkg } = updater;

  updater
    .template(".npmrc")
    .json.template("package.json", ({ current = {}, template }) => {
      Object.assign(current, template);

      if (
        current["main"] &&
        typeof current["main"] === "string" &&
        !pkg.type.is("root")
      ) {
        current["exports"] = {
          default: `./${current["main"]}`,
        };
      }

      if (pkg.type.is("tests")) {
        delete current["publishConfig"];
      }

      if (needsBuildSupport(pkg)) {
        current["devDependencies"] = {
          ...(current["devDependencies"] as object),
          "@starbeam-workspace/build-support": "workspace:^",
        };
      } else if (current["devDependencies"]) {
        delete (current["devDependencies"] as Record<string, string>)[
          "@starbeam-workspace/build-support"
        ];
      }

      function updateStarbeam(key: string, value: JsonValue): void {
        if (current["starbeam"]) {
          current["starbeam"] = {
            ...(current["starbeam"] as object),
            [key]: value,
          };
        } else {
          current[`starbeam:${key}`] = value;
        }
      }

      if (pkg.type.is("demo:react")) {
        updateStarbeam("source", "tsx");
      }

      if (pkg.type.is("library:interfaces")) {
        current["types"] = "index.ts";
        updateStarbeam("source", "ts");
      }

      if (pkg.type.is("library:upstream-types")) {
        current["types"] = "index.d.ts";
        updateStarbeam("source", "d.ts");
      }

      if (pkg.type.is("library:public")) {
        current["types"] = "index.ts";
      }

      current["scripts"] ??= {};
      const scripts = current["scripts"] as Record<string, string>;

      if (pkg.file("tsconfig.json").exists()) {
        scripts["test:types"] = "tsc -b";
      } else {
        delete scripts["test:types"];
      }

      if (pkg.dir("tests").exists()) {
        scripts["test:specs"] = "vitest --run";
      } else {
        delete scripts["test:specs"];
      }

      return consolidateStarbeam(current);
    });
}

function consolidateStarbeam(json: JsonObject): JsonObject {
  const starbeamEntries = Object.entries(json).filter(([key]) =>
    key.startsWith("starbeam:")
  );

  const otherEntries = Object.entries(json).filter(
    ([key]) => !key.startsWith("starbeam")
  );

  const rootStarbeamValue = json["starbeam"];

  if (rootStarbeamValue !== undefined && !isObject(rootStarbeamValue)) {
    throw Error(
      `Invalid starbeam entry in package.json (the "starbeam" entry in package.json must be an object): ${String(
        rootStarbeamValue
      )}`
    );
  }

  if (isSingleItemArray(starbeamEntries) && rootStarbeamValue === undefined) {
    return {
      ...Object.fromEntries(otherEntries),
      ...Object.fromEntries(starbeamEntries),
    };
  }

  const starbeamObject = Object.fromEntries(
    starbeamEntries.map(([key, value]) => [
      key.slice("starbeam:".length),
      value,
    ])
  );
  const rootStarbeam = rootStarbeamValue
    ? { ...starbeamObject, ...rootStarbeamValue }
    : starbeamObject;

  return {
    ...Object.fromEntries(otherEntries),
    starbeam: rootStarbeam,
  };
}

export const updateLibrary = UpdatePackageFn((update) => {
  update.template("rollup.config.mjs");
});

export const updateDemo = UpdatePackageFn((update, options) => {
  updateDemoEslint(update, options);
});

export const updateTests = UpdatePackageFn((update, options) => {
  updateTestsEslint(update, options);
});

const updateDemoEslint = UpdatePackageFn((updater) => {
  updater.ensureRemoved(".eslintrc.cjs");

  updater.json(".eslintrc.json", () => {
    return {
      root: false,

      overrides: [
        {
          parserOptions: {
            project: updater.path("tsconfig.json").fromWorkspaceRoot,
          },
          files: ["index.ts", "index.tsx", "src/**/*.ts", "src/**/*.tsx"],
          extends: ["plugin:@starbeam/demos"],
        },
        {
          parserOptions: {
            project: updater.path("tsconfig.json").fromWorkspaceRoot,
          },
          files: ["vite.config.ts"],
          extends: ["plugin:@starbeam/loose"],
        },
      ],
    };
  });
});

export const updateLibraryEslint = UpdatePackageFn((update) => {
  update.ensureRemoved(".eslintrc.cjs");

  update.json(".eslintrc.json", () => {
    return {
      root: false,

      overrides: [
        localEslintConfig(update, {
          tsconfig: "tsconfig.json",
          extend: eslintPlugin(update.pkg),
        }),
      ],
    };
  });
});

const updateTestsEslint = UpdatePackageFn((update) => {
  update.ensureRemoved(".eslintrc.cjs");

  update.json(".eslintrc.json", () => {
    return {
      root: false,

      overrides: [
        localEslintConfig(update, {
          extend: "@starbeam/loose",
          tsconfig: "tsconfig.json",
        }),
      ],
    };
  });
});

function eslintPlugin(pkg: Package): `@starbeam/${string}` {
  if (pkg.moduleType === "cjs") {
    return "@starbeam/commonjs";
  } else if (pkg.starbeam.source.isJS) {
    return "@starbeam/esm";
  } else if (pkg.starbeam.type.is("tests")) {
    return "@starbeam/loose";
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

  return pkg.type.isType("library")
    ? ext.flatMap((e) => [`index.${e}`, `src/**/*.${e}`])
    : ext.flatMap((e) => [`**/*.${e}`]);
}

type ConfigOverride = NonNullable<ESLint.ConfigData["overrides"]>[number];

function localEslintConfig(
  update: LabelledUpdater,
  { extend, tsconfig }: { extend: `@starbeam/${string}`; tsconfig: string }
): ConfigOverride & JsonObject {
  return {
    parserOptions: {
      project: update.path(tsconfig).fromWorkspaceRoot,
    },
    files: eslintFiles(update.pkg),
    extends: [`plugin:${extend}`],
  };
}

function needsBuildSupport(pkg: Package): boolean {
  const hasBuild = pkg.type.isType("library") || pkg.type.is("root");
  const isBuildSupport = pkg.name === "@starbeam-workspace/build-support";

  return hasBuild && !isBuildSupport && pkg.starbeam.source.isTS;
}
