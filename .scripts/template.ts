import type { Command } from "commander";
import { program } from "commander";
import { resolve } from "path";
import type { StarbeamCommandOptions } from "./commands.js";
import shell from "shelljs";
import sh from "shell-escape-tag";

export function TemplateCommand({ root }: StarbeamCommandOptions): Command {
  const TEMPLATES = {
    tsconfig: resolve(root, ".templates", "package", "tsconfig.json"),
  };

  return program
    .createCommand("template")
    .description("template a package")
    .argument("<dir>", "the directory of the package")
    .option(
      "-f, --file <file>",
      "instead of templating all files, pick a specific file",
      undefined
    )
    .option(
      "-t, --type <type>",
      "the type of package (demos, packages, framework)",
      "packages"
    )
    .action((dir, { file, type }) => {
      const absoluteDir = resolve(root, type, dir);

      if (file === undefined || file === "tsconfig") {
        shell.cp(TEMPLATES.tsconfig, resolve(absoluteDir, "tsconfig.json"));
      }

      // const cmd = sh`vite --port ${port} --host ${host} -c ${root}/demos/${name}/vite.config.ts ${
      //   strict ? "--strictPort" : ""
      // }`;
      // execSync(cmd, {
      //   stdio: "inherit",
      //   cwd: resolve(root, "demos", name),
      // });
    });
}
