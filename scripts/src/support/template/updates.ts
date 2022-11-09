import { isSingleItemArray } from "@starbeam/core-utils";

import { type JsonObject, type JsonValue, isObject } from "../json.js";
import type { Package } from "../packages.js";
import type { Paths } from "../paths.js";
import type { Workspace } from "../workspace.js";
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

      if (pkg.type.isType("library") || pkg.type.is("root")) {
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

      const scripts: Record<string, string> = {
        "test:lint": "eslint",
      };

      if (pkg.file("tsconfig.json").exists()) {
        scripts["test:types"] = "tsc -b";
      }

      if (pkg.dir("tests").exists()) {
        scripts["test:specs"] = "vitest";
      }

      current["scripts"] = {
        ...(isObject(current["scripts"]) ? current["scripts"] : undefined),
        ...scripts,
      };

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
      parserOptions: {
        project: updater.path("tsconfig.json").fromWorkspaceRoot,
      },
      overrides: [
        {
          files: ["index.ts", "index.tsx", "src/**/*.ts", "src/**/*.tsx"],
          extends: ["plugin:@starbeam/demos"],
        },
        {
          files: ["vite.config.ts"],
          extends: ["plugin:@starbeam/loose"],
        },
      ],
    };
  });
});

export const updateLibraryEslint = UpdatePackageFn((update) => {
  update.ensureRemoved(".eslintrc.cjs");

  const plugin = eslintPlugin(update.pkg);

  update.json(".eslintrc.json", () => {
    return {
      root: false,
      parserOptions: {
        project: update.path("tsconfig.json").fromWorkspaceRoot,
      },
      overrides: [
        {
          files: eslintFiles(update.pkg),
          extends: [`plugin:${plugin}`],
        },
      ],
    };
  });

  if (update.pkg.testsDirectory.exists()) {
    update.ensureRemoved("tests/.eslintrc.cjs");

    update.json("tests/.eslintrc.json", () => {
      return {
        root: false,
        parserOptions: {
          project: update.path("tests/tsconfig.json").fromWorkspaceRoot,
        },
        overrides: [
          {
            files: eslintFiles(update.pkg),
            extends: ["plugin:@starbeam/loose"],
          },
        ],
      };
    });
  }
});

const updateTestsEslint = UpdatePackageFn((update) => {
  update.ensureRemoved(".eslintrc.cjs");

  update.json(".eslintrc.json", () => {
    return {
      root: false,
      parserOptions: {
        project: update.path("tsconfig.json").fromWorkspaceRoot,
      },
      overrides: [
        {
          files: eslintFiles(update.pkg),
          extends: ["plugin:@starbeam/demos"],
        },
        {
          files: ["vite.config.ts"],
          extends: ["plugin:@starbeam/loose"],
        },
      ],
    };
  });
});

function eslintPlugin(pkg: Package): `@starbeam/${string}` {
  if (pkg.moduleType === "cjs") {
    return "@starbeam/commonjs";
  } else if (pkg.starbeam.source.isJS) {
    return "@starbeam/loose";
  } else {
    return "@starbeam/tight";
  }
}

function eslintFiles(pkg: Package): string[] {
  const tsconfig = pkg.tsconfigJSON();

  return tsconfig?.includes ?? ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"];
}
