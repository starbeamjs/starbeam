import chalk from "chalk";
import type { Command } from "commander";
import { program } from "commander";
import glob from "fast-glob";
import { resolve } from "node:path";
import shell from "shelljs";
import type { StarbeamCommandOptions } from "./commands.js";
import { queryable } from "./list.js";

export function CleanCommand({ root }: StarbeamCommandOptions): Command {
  return queryable(
    root,
    program
      .createCommand("clean")
      .description("clean typescript artifacts")
      .option("--dir <dir>", "the directory to clean")
      .option("-d, --dry-run", "don't actually delete anything")
      .option("-v, --verbose", "print what's being deleted"),
    async (
      packages,
      options: { dryRun: boolean; verbose: boolean; dir?: string }
    ) => {
      if (options.dir) {
        return cleanFiles({
          description: options.dir,
          cwd: resolve(root, options.dir),
          root: resolve(root, options.dir),
          options,
        });
      }

      for (const pkg of packages) {
        if (pkg.isTypescript) {
          await cleanFiles({
            description: pkg.name,
            cwd: pkg.root,
            root: pkg.root,
            options,
          });
        } else {
          console.log(chalk.gray(`- Skipping ${pkg.name} (not typescript)`));
        }
      }
    }
  );
}

async function cleanFiles({
  description,
  cwd,
  root,
  options,
}: {
  description: string;
  cwd: string;
  root: string;
  options: { verbose: boolean; dryRun: boolean };
}) {
  const verbose = options.dryRun || options.verbose;
  const dryRun = options.dryRun;

  console.log(chalk.magenta(`=== Cleaning ${description} ===`));
  const files = await glob(["**/*.{js,jsx,d.ts,map}"], {
    cwd,
    ignore: ["**/node_modules/**", "**/env.d.ts"],
  });

  if (files.length > 0) {
    for (const file of files) {
      if (verbose) {
        console.log(chalk.gray(`- removing ${file}`));
      }

      if (!dryRun) {
        shell.rm(resolve(root, file));
      }
    }
  } else {
    console.log(chalk.gray(`- nothing to clean`));
  }
}
