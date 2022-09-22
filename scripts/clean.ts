import chalk from "chalk";
import glob from "fast-glob";
import { resolve } from "node:path";
import shell from "shelljs";
import { QueryCommand, StringOption } from "./support/commands.js";

export const CleanCommand = QueryCommand("clean", {
  description: "clean up build artifacts",
})
  .flag(["-d", "dryRun"], "don't actually delete anything")
  .option("dir", "the directory to clean", StringOption)

  .action(async ({ root, packages, ...options }) => {
    if (options.dir) {
      return cleanFiles({
        description: options.dir,
        cwd: resolve(root, options.dir),
        pkgRoot: resolve(root, options.dir),
        options,
      });
    }

    for (const pkg of packages) {
      if (pkg.isTypescript) {
        await cleanFiles({
          description: pkg.name,
          cwd: pkg.root,
          pkgRoot: pkg.root,
          options,
        });
      } else {
        console.log(chalk.gray(`- Skipping ${pkg.name} (not typescript)`));
      }
    }
  });

async function cleanFiles({
  description,
  cwd,
  pkgRoot,
  options,
}: {
  description: string;
  cwd: string;
  pkgRoot: string;
  options: { verbose: boolean; dryRun: boolean };
}) {
  const verbose = options.dryRun || options.verbose;
  const dryRun = options.dryRun;

  console.log(chalk.magenta(`=== Cleaning ${description} ===`));
  const files = await glob(
    ["*.{js,jsx,d.ts,map}", "src/**/*.{js,jsx,d.ts,map}", "dist/"],
    {
      cwd,
      objectMode: true,
      onlyFiles: false,
      throwErrorOnBrokenSymbolicLink: true,
      ignore: ["**/node_modules/**", "**/env.d.ts"],
    }
  );

  if (files.length > 0) {
    for (const file of files) {
      if (verbose) {
        console.log(chalk.gray(`- removing ${file.name}`));
      }

      if (!dryRun) {
        if (file.dirent.isDirectory()) {
          shell.rm("-rf", resolve(pkgRoot, file.name));
        } else {
          shell.rm(resolve(pkgRoot, file.name));
        }
      }
    }

    if (!verbose) {
      console.log(chalk.gray(`  - done`));
    }
  } else {
    console.log(chalk.gray(`  - nothing to clean`));
  }
}
