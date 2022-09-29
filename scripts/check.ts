import sh from "shell-escape-tag";
import { DevCommand } from "./support/commands.js";

export const CheckCommand = DevCommand("check", {
  description: "run all of the checks",
})
  .flag(["-f", "failFast"], `exit on first failure`)
  .action(async ({ workspace }) => {
    await workspace.exec(sh`pnpm check:unused -f`);
    await workspace.exec(sh`pnpm check:types`);
    await workspace.exec(sh`pnpm check:lint`);
  });
