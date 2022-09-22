import sh from "shell-escape-tag";
import { DevCommand } from "./support/commands.js";

export const CheckCommand = DevCommand("check", {
  description: "run all of the checks",
})
  .flag(["-f", "failFast"], `exit on first failure`)
  .action(({ workspace, failFast }) => {
    workspace.exec(sh`pnpm check:unused -f`, { failFast });
    workspace.exec(sh`pnpm check:types`, { failFast });
    workspace.exec(sh`pnpm check:lint`, { failFast });
  });
