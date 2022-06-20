import type { Command } from "commander";
import { program } from "commander";
import { resolve } from "path";
import type { StarbeamCommandOptions } from "./commands.js";
import shell from "shelljs";
import sh from "shell-escape-tag";
import { readFileSync, writeFileSync } from "fs";
import { packages } from "./packages.js";

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
      const dirs =
        dir === "all"
          ? packages(root).map((p) => p.root)
          : [resolve(root, type, dir)];

      for (const dir of dirs) {
        console.log(`Updating package.json in ${dir}`);
        const absoluteDir = resolve(root, type, dir);

        const splice = JSON.parse(
          readFileSync(
            resolve(root, ".templates", "package", "package.json"),
            "utf8"
          )
        );

        const editingJSON = resolve(absoluteDir, "package.json");

        const json = JSON.parse(readFileSync(editingJSON, "utf-8"));

        json.publishConfig = splice.publishConfig;

        writeFileSync(editingJSON, JSON.stringify(json, null, 2));
      }
    });
}
