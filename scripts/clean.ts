import glob from "fast-glob";
import { rmSync } from "node:fs";
import { relative } from "node:path";
import shell from "shelljs";
import { QueryCommand, StringOption } from "./support/commands.js";
import { comment, header, log, problem } from "./support/log.js";
import { Package } from "./support/packages.js";
import type { Reporter } from "./support/reporter.js";
import type { Workspace } from "./support/workspace.js";

export const CleanCommand = QueryCommand("clean", {
  description: "clean up build artifacts",
})
  .flag(["-d", "dryRun"], "don't actually delete anything")
  .option("dir", "the directory to clean", StringOption)
  .action(async ({ workspace, packages, ...options }) => {
    const reporter = workspace.reporter;

    if (options.dir) {
      const pkg = Package.from(
        workspace,
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
}) {
  const patterns = ["dist/", "**/tsconfig.tsbuildinfo"];
  const roots = packageRoots(pkg);
  const cwd = pkg.root.absolute;

  if (!pkg.type?.is("root")) {
    const extensions = new Set(["map", "js", "jsx", "d.ts"]);
    if (pkg.type?.is("interfaces")) {
      extensions.delete("d.ts");
    }
    if (pkg?.starbeam.keepJs === true) {
      extensions.delete("js");
      extensions.delete("jsx");
      extensions.delete("d.ts");
    }
    patterns.push(
      ...roots.map((root) => `${root}*.{${[...extensions].join(",")}}`)
    );
  }

  const files = await glob(patterns, {
    cwd,
    absolute: true,
    objectMode: true,
    onlyFiles: false,
    throwErrorOnBrokenSymbolicLink: true,
    ignore: ["**/node_modules/**", "**/env.d.ts", "dist/**"],
  });

  const isClean = files.length === 0;
  const action = isClean ? "✔️" : "🧹";

  await reporter.group(header(pkg.name) + comment(": ") + action).try((r) => {
    r.verbose((r) => {
      r.log(comment(`in ${pkg.root.relativeFrom(workspace.root)}`));
    });

    if (isClean) {
      return;
    }

    const REMOVING = options.dryRun ? `Would remove` : `Removing`;

    for (const file of files) {
      reporter.verbose(
        (r) => r.log(`${REMOVING} ${relative(cwd, file.path)}`),
        { also: options.dryRun }
      );

      if (!options.dryRun) {
        if (file.dirent.isDirectory()) {
          shell.rm("-rf", file.path);
        } else {
          rmSync(file.path);
        }
      }
    }
  });
}
