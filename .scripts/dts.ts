import { program, type Command } from "commander";
import type { StarbeamCommandOptions } from "./commands.js";
import { packages } from "./packages.js";
import sh from "shell-escape-tag";
import shell from "shelljs";

export function DtsCommand({ root }: StarbeamCommandOptions): Command {
  return program
    .createCommand("dts")
    .description("generate d.ts files for all packages")
    .action(() => {
      const packageList = packages(root);

      for (const { name, root } of packageList) {
        console.log("generating d.ts for", name);
        shell.rm("-rf", `${root}/dist/types`);
        shell.exec(sh`tsc --project ${root}/tsconfig.json`);
      }
    });
}
