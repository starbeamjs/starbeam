import glob from "fast-glob";
import { rmSync } from "node:fs";
import { relative } from "node:path";
import shell from "shelljs";
import { QueryCommand, StringOption } from "./support/commands.js";
import { comment, header, log, problem } from "./support/log.js";
import type { Package } from "./support/packages.js";

export const CleanCommand = QueryCommand("clean", {
  description: "clean up build artifacts",
})
  .flag(["-d", "dryRun"], "don't actually delete anything")
  .option("dir", "the directory to clean", StringOption)
  .action(async ({ workspace, packages, ...options }) => {
    if (options.dir) {
      return cleanFiles({
        description: options.dir,
        cwd: workspace.dir(options.dir).absolute,
        roots: ["**/"],
        options,
      });
    }

    for (const pkg of packages) {
      if (pkg.isTypescript) {
        await cleanFiles({
          description: pkg.name,
          cwd: pkg.root.absolute,
          roots: roots(pkg),
          options,
        });
      } else {
        log(`- skipping ${pkg.name} (not a typescript package)`, comment);
      }
    }
  });

function roots(pkg: Package) {
  if (pkg.type === "library") {
    return ["", "src/**/"];
  } else {
    return ["**/"];
  }
}

async function cleanFiles({
  description,
  cwd,
  roots,
  options,
}: {
  description: string;
  cwd: string;
  roots: string[];
  options: { verbose: boolean; dryRun: boolean };
}) {
  const patterns = [
    ...roots.map((root) => `${root}*.{js,jsx,d.ts,map}`),
    "dist/",
  ];

  const files = await glob(patterns, {
    cwd,
    absolute: true,
    objectMode: true,
    onlyFiles: false,
    throwErrorOnBrokenSymbolicLink: true,
    ignore: ["**/node_modules/**", "**/env.d.ts"],
  });

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
        log(`${REMOVING} ${relative(cwd, file.path)}`, problem);
      }

      if (!options.dryRun) {
        if (file.dirent.isDirectory()) {
          shell.rm("-rf", file.path);
        } else {
          rmSync(file.path);
          // shell.rm(resolve(pkgRoot, file.name));
        }
      }
    }

    if (!options.verbose && !options.dryRun) {
      log("- done", comment);
    }
  } else if (options.verbose) {
    log(`- nothing to clean`, comment);
  }

  if (files.length > 0 || options.verbose) {
    console.groupEnd();
  }
}
