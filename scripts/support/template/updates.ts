import { isObject, type JsonObject, type JsonValue } from "../json.js";
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

      if (current.main && !pkg.type.is("root")) {
        current.exports = {
          default: `./${current.main}`,
        };
      }

      if (pkg.type.is("tests")) {
        delete current.publishConfig;
      }

      if (pkg.type.is("library", "root")) {
        current.devDependencies = {
          ...(current.devDependencies as object),
          "@starbeam-workspace/build-support": "workspace:^",
        };
      } else if (current.devDependencies) {
        delete (current.devDependencies as Record<string, string>)[
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

      if (pkg.type.is("interfaces")) {
        current.types = "index.d.ts";
        updateStarbeam("source", "d.ts");
      }

      const scripts: Record<string, string> = {
        "test:lint": "eslint",
      };

      if (pkg.file("tsconfig.json").exists()) {
        scripts["test:types"] = "tsc -b";
      }

      if (pkg.dir("tests").exists()) {
        scripts["test:specs"] = "vitest --dir ./tests --run";
      }

      current.scripts = {
        ...(isObject(current.scripts) ? current.scripts : undefined),
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
      `Invalid starbeam entry in package.json (the "starbeam" entry in package.json must be an object): ${rootStarbeamValue}`
    );
  }

  if (starbeamEntries.length === 1 && rootStarbeamValue === undefined) {
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

export const updateLibrary = UpdatePackageFn((updater) => {
  updater.template("rollup.config.mjs");
});
