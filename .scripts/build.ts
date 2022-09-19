import { execSync } from "child_process";
import type { Command } from "commander";
import { program } from "commander";
import sh from "shell-escape-tag";
import type { StarbeamCommandOptions } from "./commands.js";

export function BuildCommand({ root }: StarbeamCommandOptions): Command {
  return program
    .createCommand("build")
    .description("prepare the packages for publishing")
    .action(() => {
      execSync(sh`pnpm build:scripts`, { stdio: "inherit", cwd: root });
      execSync(sh`pnpm build:packages`, { stdio: "inherit", cwd: root });
    });
}
