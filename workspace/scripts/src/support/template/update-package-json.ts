import { isSingleItemArray } from "@starbeam/core-utils";
import {
  type JsonObject,
  type JsonValue,
  isObject,
} from "@starbeam-workspace/json";
import type { Package } from "@starbeam-workspace/package";

import type { LabelledUpdater } from "./update-package.js";

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
          "@starbeam-dev/build-support": "workspace:*",
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

function needsBuildSupport(pkg: Package): boolean {
  const hasBuild = pkg.type.isType("library") || pkg.type.is("root");
  const isBuildSupport = pkg.name === "@starbeam-workspace/build-support";

  return hasBuild && !isBuildSupport && pkg.starbeam.source.isTS;
}
