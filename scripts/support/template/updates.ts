import type { Paths } from "../paths.js";
import type { Workspace } from "../workspace.js";
import { TemplateName, type Templates } from "./templates.js";
import type { UpdatePackage } from "./update-package.js";

export type PackageUpdater = (
  updater: UpdatePackage,
  options: { workspace: Workspace; paths: Paths; templates: Templates }
) => void;

export function PackageUpdater(updater: PackageUpdater): PackageUpdater {
  return updater;
}

export function updatePackageJSON(updater: UpdatePackage): void {
  const templateFile = TemplateName.assert(
    updater.pkg.starbeam.templates["package.json"]
  );

  const template = updater.template(templateFile);
  const splice = JSON.parse(template);

  updater.updateJsonFile("package.json", (prev) => {
    Object.assign(prev, splice);

    if (prev.main) {
      prev.exports = {
        default: `./${prev.main}`,
      };
    }

    if (updater.type === "library") {
      prev.devDependencies = {
        ...(prev.devDependencies as object),
        "@starbeam-workspace/build-support": "workspace:^",
      };
    }

    return prev;
  });
}

export const updateTest = PackageUpdater((updater, { templates }) => {
  const npmrc = templates.get("npmrc");
  updater.updateFile(".npmrc", npmrc);
});

export const updateLibrary = PackageUpdater((updater, { templates }) => {
  const rollup = templates.get("rollup.config.mjs");
  updater.updateFile("rollup.config.mjs", rollup);
});
