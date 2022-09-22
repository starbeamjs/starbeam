import chalk from "chalk";
import glob from "fast-glob";
import { resolve } from "node:path";
import shell from "shelljs";
import { QueryCommand, StringOption } from "./support/commands.js";
import { comment, header, log } from "./support/log.js";

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
    console.group(header(description));
  } else if (options.verbose) {
    log(header(description) + comment(": no files to clean"));
    return;
  }

  const REMOVING = options.dryRun ? `Would remove` : `Removing`;

  if (files.length > 0) {
    for (const file of files) {
      if (options.verbose || options.dryRun) {
        console.log(chalk.red(`- ${REMOVING} ${file.name}`));
      }

      if (!options.dryRun) {
        if (file.dirent.isDirectory()) {
          shell.rm("-rf", resolve(pkgRoot, file.name));
        } else {
          shell.rm(resolve(pkgRoot, file.name));
        }
      }

      if (!options.verbose && !options.dryRun) {
        log("- done", comment);
      }
    }
  } else if (options.verbose) {
    log(`- nothing to clean`, comment);
  }

  if (files.length > 0 || options.verbose) {
    console.groupEnd();
  }
}
