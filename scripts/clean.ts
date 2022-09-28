import glob from "fast-glob";
import { rmSync } from "node:fs";
import { relative } from "node:path";
import shell from "shelljs";
import { QueryCommand, StringOption } from "./support/commands.js";
import { comment, header, log, problem } from "./support/log.js";
import { Package } from "./support/packages.js";

export const CleanCommand = QueryCommand("clean", {
  description: "clean up build artifacts",
})
  .flag(["-d", "dryRun"], "don't actually delete anything")
  .option("dir", "the directory to clean", StringOption)
  .action(async ({ workspace, packages, ...options }) => {
    if (options.dir) {
      const pkg = Package.from(
        workspace.root.dir(options.dir).file("package.json"),
        { allow: "missing" }
      );

      if (pkg === undefined) {
        log(`No package found at ${options.dir}`, problem);
        process.exit(1);
      }

      return cleanFiles({
        description: options.dir,
        pkg,
        options,
      });
    }

    for (const pkg of packages) {
      if (pkg.isTypescript) {
        await cleanFiles({
          description: pkg.name,
          pkg,
          options,
        });
      } else {
        log(`- skipping ${pkg.name} (not a typescript package)`, comment);
      }
    }
  });

function packageRoots(pkg: Package) {
  if (pkg.type?.is("library")) {
    return ["", "src/**/"];
  } else {
    return ["**/"];
  }
}

async function cleanFiles({
  description,
  pkg,
  options,
}: {
  description: string;
  pkg: Package;
  options: { verbose: boolean; dryRun: boolean };
}) {
  const patterns = ["dist/", "**/tsconfig.tsbuildinfo"];
  const roots = packageRoots(pkg);
  const cwd = pkg.root.absolute;

  if (pkg?.starbeam.keepJs === false) {
    patterns.push(...roots.map((root) => `${root}*.{js,jsx,d.ts,map}`));
  }

  const files = await glob(patterns, {
    cwd,
    absolute: true,
    objectMode: true,
    onlyFiles: false,
    throwErrorOnBrokenSymbolicLink: true,
    ignore: ["**/node_modules/**", "**/env.d.ts", "dist/**"],
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
