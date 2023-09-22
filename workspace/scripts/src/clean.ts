import { rmSync } from "node:fs";
import { relative } from "node:path";

import { isPresentArray } from "@starbeam/core-utils";
import { Package } from "@starbeam-workspace/package";
import type { Reporter, Workspace } from "@starbeam-workspace/reporter";
import { Fragment } from "@starbeam-workspace/reporter";
import { fatal } from "@starbeam-workspace/shared";
import glob from "fast-glob";
import shell from "shelljs";

import { QueryCommand } from "./support/commands/query-command";
import { StringOption } from "./support/commands/types";

export const CleanCommand = QueryCommand("clean", {
  description: "clean up build artifacts",
})
  .flag("--dry-run", "don't actually delete anything")
  .option("--dir", "the directory to clean", StringOption)
  .action(async ({ workspace, packages, ...options }) => {
    const reporter = workspace.reporter;

    await reporter
      .group()
      .empty((r) => {
        r.log(Fragment("ok", "👍 Nothing to clean"));
      })
      .tryAsync(async (r) => {
        if (options.dir) {
          const pkg = Package.from(
            workspace,
            workspace.root.dir(options.dir).file("package.json"),
            { allow: "missing" },
          );

          if (pkg === undefined) {
            fatal(
              workspace.reporter.fatal(`No package found at ${options.dir}`),
            );
          }

          return cleanFiles({
            description: options.dir,
            pkg,
            workspace,
            reporter,
            options,
          });
        }

        for (const pkg of packages) {
          if (pkg.isTypescript) {
            await cleanFiles({
              description: pkg.name,
              pkg,
              workspace,
              reporter,
              options,
            });
          } else {
            r.ul({
              header: pkg.name,
              items: [`skipping ${pkg.name} (not a typescript package)`],
              item: "comment",
            });
          }
        }
      });
  });

async function cleanFiles({
  pkg,
  workspace,
  reporter,
  options,
}: {
  description: string;
  pkg: Package;
  workspace: Workspace;
  reporter: Reporter;
  options: { verbose: boolean; dryRun: boolean };
}): Promise<void> {
  const patterns = ["dist", "**/tsconfig.tsbuildinfo"];
  const cwd = pkg.root.absolute;

  if (!pkg.type.is("root")) {
    const outputs = pkg.sources.outputs(pkg.root);

    for (const output of outputs) {
      patterns.push(output.absolute);
    }
  }

  const files = await glob(patterns, {
    cwd,
    absolute: true,
    objectMode: true,
    onlyFiles: false,
    throwErrorOnBrokenSymbolicLink: true,
    ignore: [
      "**/node_modules/**",
      "**/env.d.ts",
      "dist/*",
      "dist/*/**",
      // these aren't currently included in EXT, but let's make sure we don't actually clean these
      // up if they get added
      "**/*.mjs",
      "**/*.cjs",
    ],
  });

  const isClean = !isPresentArray(files);

  if (isClean) {
    if (reporter.isVerbose) {
      reporter.log(Fragment("header", `👍 ${pkg.name}`));
    }

    return;
  }

  reporter
    .group([Fragment("comment", "✓ "), Fragment("header", pkg.name)])
    .try((r) => {
      r.verbose((r) => {
        r.log(
          Fragment("comment", ` in ${pkg.root.relativeFrom(workspace.root)}`),
        );
      });

      const REMOVING = options.dryRun ? `Would remove` : `Removing`;

      for (const file of files) {
        if (reporter.isVerbose || options.dryRun) {
          reporter.log(` ${REMOVING} ${relative(cwd, file.path)}`);
        }

        if (!options.dryRun) {
          if (file.dirent.isDirectory()) {
            shell.rm("-rf", file.path);
          } else {
            rmSync(file.path);
          }
        }

        if (!reporter.isVerbose && !options.dryRun) {
          reporter.printEmpty();
        }
      }
    });
}
