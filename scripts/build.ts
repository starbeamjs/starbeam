import { execSync } from "child_process";
import sh from "shell-escape-tag";
import { DevCommand } from "./support/commands.js";

export const BuildCommand = DevCommand("build", {
  description: "prepare the packages for publishing",
}).action(({ root }) => {
  execSync(sh`pnpm build:scripts`, { stdio: "inherit", cwd: root });
  execSync(sh`pnpm build:packages`, { stdio: "inherit", cwd: root });
});
