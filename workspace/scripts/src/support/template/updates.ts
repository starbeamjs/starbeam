import type { Directory, Paths } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";

import { updateEslint } from "./update-eslint.js";
import type { LabelledUpdater } from "./update-package.js";

export type SyncUpdatePackageFn = (
  updater: LabelledUpdater,
  options: { workspace: Workspace; paths: Paths; root: Directory },
) => void;

export type AsyncUpdatePackageFn = (
  updater: LabelledUpdater,
  options: { workspace: Workspace; paths: Paths; root: Directory },
) => Promise<void>;

export type UpdatePackageFn = SyncUpdatePackageFn | AsyncUpdatePackageFn;

export function UpdatePackageFn(
  updater: SyncUpdatePackageFn,
): SyncUpdatePackageFn;
export function UpdatePackageFn(
  updater: AsyncUpdatePackageFn,
): AsyncUpdatePackageFn;
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
