import type { Workspace } from "../workspace.js";
import { Templates } from "./templates.js";
import type { TemplateName, UpdatePackage } from "./update-package.js";

export type PackageUpdater = (
  updater: UpdatePackage,
  workspace: Workspace
) => void;

export function updatePackageJSON(updater: UpdatePackage): void {
  let templateFile: TemplateName;

  if (updater.type === "interfaces") {
    templateFile = "interfaces.package.json";
  } else {
    templateFile = "package.json";
  }

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

export function updateTest(updater: UpdatePackage, workspace: Workspace): void {
  const templates = new Templates(workspace);
  const npmrc = templates.get("npmrc");

  updater.updateFile(".npmrc", npmrc);
}

export function updateLibrary(
  updater: UpdatePackage,
  workspace: Workspace
): void {
  const templates = new Templates(workspace);
  const rollup = templates.get("rollup.config.mjs");

  updater.updateFile("rollup.config.mjs", rollup);
}
