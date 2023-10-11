import type { Workspace } from "@starbeam-workspace/reporter";
import type { Directory, WorkspacePath } from "trailway";

import type { LabelledUpdater } from "../updating/update-file.js";

export type SyncUpdatePackageFn = (
  updater: LabelledUpdater,
  options: { workspace: Workspace; paths: WorkspacePath; root: Directory },
) => void;

export type AsyncUpdatePackageFn = (
  updater: LabelledUpdater,
  options: { workspace: Workspace; paths: WorkspacePath; root: Directory },
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

export const updateDemo = UpdatePackageFn((update) => {
  update.template("vite.config.ts");
});
