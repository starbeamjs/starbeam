import sh from "shell-escape-tag";
import { DevCommand } from "./support/commands.js";

export const BuildCommand = DevCommand("build", {
  description: "prepare the packages for publishing",
}).action(async ({ workspace }) => {
  await workspace.exec(sh`rollup -c ./rollup.config.mjs`);
});
