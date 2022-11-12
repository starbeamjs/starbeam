import type { Paths } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";

import { updateDemoEslint, updateTestsEslint } from "./update-eslint";
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

export const updateLibrary = UpdatePackageFn((update) => {
  update.template("rollup.config.mjs");
});

export const updateDemo = UpdatePackageFn((update, options) => {
  updateDemoEslint(update, options);
});

export const updateTests = UpdatePackageFn((update, options) => {
  updateTestsEslint(update, options);
});
