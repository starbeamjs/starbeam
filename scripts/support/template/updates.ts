import type { Paths } from "../paths.js";
import { TemplateName } from "../unions.js";
import type { Workspace } from "../workspace.js";
import type { UpdatePackage } from "./update-package.js";

export type PackageUpdater = (
  updater: UpdatePackage,
  options: { workspace: Workspace; paths: Paths }
) => void;

export function PackageUpdater(updater: PackageUpdater): PackageUpdater {
  return updater;
}

export function updatePackageJSON(updater: UpdatePackage): void {
  const templateFile = TemplateName.fromString(
    updater.pkg.starbeam.templates["package.json"]
  );

  const template = updater.template(templateFile);
  const splice = JSON.parse(template);

  updater.updateJsonFile("package.json", (prev) => {
    Object.assign(prev, splice);

    if (prev.main && !updater.type?.is("root")) {
      prev.exports = {
        default: `./${prev.main}`,
      };
    }

    if (updater.type?.is("library")) {
      prev.devDependencies = {
        ...(prev.devDependencies as object),
        "@starbeam-workspace/build-support": "workspace:^",
      };
    }

    if (updater.type?.is("demo:react")) {
      if (prev["starbeam:source"]) {
        prev["starbeam:source"] = "tsx";
      } else if (prev["starbeam"]) {
        prev["starbeam"] = {
          ...(prev["starbeam"] as object),
          source: "tsx",
        };
      } else {
        prev["starbeam:source"] = "tsx";
      }
    }

    if (updater.type?.is("interfaces")) {
      prev.types = "index.d.ts";
    }

    const scripts: Record<string, string> = {
      "test:lint": "eslint",
    };

    if (updater.hasTsconfig()) {
      scripts["test:build"] = "tsc -b";
    }

    if (updater.hasTests()) {
      scripts["test:specs"] = "vitest --dir ./tests --run";
    }

    prev.scripts = {
      ...(prev.scripts as object),
      ...scripts,
    };

    return prev;
  });
}

export const updateTest = PackageUpdater((updater, { workspace }) => {
  const npmrc = TemplateName.fromString("npmrc").read(workspace.root);
  updater.updateFile(".npmrc", npmrc);
});

export const updateLibrary = PackageUpdater((updater) => {
  const rollup = updater.template(TemplateName.from("rollup.config.mjs"));
  updater.updateFile("rollup.config.mjs", rollup);
});
