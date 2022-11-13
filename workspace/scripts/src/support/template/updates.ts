import type { Directory, Paths } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";

import { updateEslint } from "./update-eslint.js";
import type { LabelledUpdater } from "./update-package.js";

export type UpdatePackageFn = (
  updater: LabelledUpdater,
  options: { workspace: Workspace; paths: Paths; root: Directory }
) => void;

export function UpdatePackageFn(updater: UpdatePackageFn): UpdatePackageFn {
  return updater;
}

export const updateRollup = UpdatePackageFn((update) => {
  update.template("rollup.config.mjs");
});

export const updateDemo = UpdatePackageFn((update, options) => {
  update.template("vite.config.ts");
  updateEslint.demo(update, options);
});
