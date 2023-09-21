import { isSingleItemArray } from "@starbeam/core-utils";
import {
  isObject,
  type JsonObject,
  type JsonValue,
} from "@starbeam-workspace/json";
import type { Package } from "@starbeam-workspace/package";
import { Fragment, fragment } from "@starbeam-workspace/reporter";
import { fatal } from "@starbeam-workspace/shared";

import type { LabelledUpdater } from "./update-package.js";

export function updatePackageJSON(updater: LabelledUpdater): void {
  const { pkg } = updater;
  const workspace = pkg.workspace;

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

      const devDependencies = (current["devDependencies"] ??= {}) as Record<
        string,
        string
      >;

      if (pkg.name !== "@starbeam/eslint-plugin") {
        devDependencies["@starbeam/eslint-plugin"] = "workspace:^";
      }

      if (needsBuildSupport(pkg)) {
        devDependencies["@starbeam-dev/build-support"] = "workspace:^";
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

      if (pkg.type.isType("demo")) {
        current["devDependencies"] = {
          ...(current["devDependencies"] as object),
          "@vitest/ui": "^0.34.4",
        };
      }

      if (pkg.type.is("demo:react")) {
        updateStarbeam("source", "tsx");
      }

      if (pkg.type.is("tests")) {
        updateStarbeam("source", "ts");
      }

      if (pkg.type.is("library:interfaces")) {
        if (current["main"] === "index.ts") {
          current["types"] = "index.ts";
          updateStarbeam("source", "ts");
        } else if (current["main"] === "index.d.ts") {
          current["types"] = "index.d.ts";
          updateStarbeam("source", "d.ts");
          current["publishConfig"] = {
            exports: {
              default: "./index.d.ts",
            },
          };
        } else {
          workspace.reporter.error(`Invalid main entry in package.json`);
          fatal(
            workspace.reporter.fatal(
              fragment`Since the package type is library:interfaces, main must either be ${Fragment.header.inverse(
                "index.ts",
              )} or ${Fragment.header.inverse("index.d.ts")}`,
            ),
          );
        }
      }

      if (pkg.type.is("library:upstream-types")) {
        current["types"] = "index.d.ts";
        updateStarbeam("source", "d.ts");
      }

      if (pkg.type.is("library:public")) {
        current["types"] = "index.ts";
      }

      // if (pkg.type.is("tests")) {}

      current["scripts"] ??= {};
      const scripts = current["scripts"] as Record<string, string>;

      if (pkg.file("tsconfig.json").exists()) {
        scripts["test:types"] = pkg.starbeam.type.hasCategory("demo")
          ? "tsc --noEmit -p tsconfig.json"
          : "tsc -b";
      } else {
        delete scripts["test:types"];
      }

      if (pkg.dir("tests").exists()) {
        scripts["test:specs"] = "vitest --run";
      } else {
        delete scripts["test:specs"];
      }

      scripts["test:lint"] = `eslint . --max-warnings 0`;

      return consolidateStarbeam(current);
    });
}

function consolidateStarbeam(json: JsonObject): JsonObject {
  const starbeamEntries = Object.entries(json).filter(([key]) =>
    key.startsWith("starbeam:"),
  );

  const otherEntries = Object.entries(json).filter(
    ([key]) => !key.startsWith("starbeam"),
  );

  const rootStarbeamValue = json["starbeam"];

  if (rootStarbeamValue !== undefined && !isObject(rootStarbeamValue)) {
    throw Error(
      `Invalid starbeam entry in package.json (the "starbeam" entry in package.json must be an object): ${String(
        rootStarbeamValue,
      )}`,
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
    ]),
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
  const isBuildSupport = pkg.name === "@starbeam-dev/build-support";

  return hasBuild && !isBuildSupport && pkg.starbeam.source.hasTS;
}
