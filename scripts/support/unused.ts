import depcheck from "depcheck";
import type { Package } from "./packages.js";
import { Style } from "./log.js";
import type { Globs, RegularFile, Glob } from "./paths.js";
import type { Workspace } from "./workspace.js";
import type { Reporter } from "./reporter/reporter.js";
import { PresentArray } from "./type-magic.js";

/**
 * These types represent builtin APIs that don't require an implementation package.
 */
const ALLOW_TYPE_ONLY = ["@types/node"];

type ParserName = keyof typeof depcheck.parser;

function Parsers(options: {
  [P in ParserName]?: Globs<RegularFile> | Glob<RegularFile>;
}): Record<string, depcheck.Parser> {
  const parsers: Record<string, depcheck.Parser> = {};

  for (const [parser, globs] of Object.entries(options) as [
    ParserName,
    Glob | Globs
  ][]) {
    for (const glob of globs.asGlobs()) {
      add(glob, parser);
    }
  }

  return parsers;

  function add(glob: Glob, parser: ParserName): void {
    parsers[glob.absolute] = depcheck.parser[parser];
  }
}

const OPTIONS: depcheck.Options = {
  ignoreDirs: ["dist"],
  ignoreBinPackage: false, // ignore the packages with bin entry
  skipMissing: false, // skip calculation of missing dependencies
  ignorePatterns: [],

  detectors: [
    // the target detectors
    depcheck.detector.requireCallExpression,
    depcheck.detector.importDeclaration,
    depcheck.detector.importCallExpression,
    depcheck.detector.typescriptImportType,
    depcheck.detector.exportDeclaration,
  ],
  specials: [
    // the target special parsers
    depcheck.special.eslint,
    depcheck.special.babel,
  ],
};

export async function checkUnused({
  pkg,
  options,
}: {
  pkg: Package;
  options?: depcheck.Options;
}): Promise<"success" | "failure"> {
  const workspace = pkg.workspace;

  const config = {
    es6: pkg.sources
      .javascript(pkg.root)
      .add(pkg.root.glob("rollup.config.mjs", { match: ["files"] }))
      .add(pkg.root.glob("vite.config.ts", { match: ["files"] })),
    jsx: pkg.sources.jsx(pkg.root),
    typescript: pkg.sources.typescript(pkg.root),
    sass: pkg.root.glob("**/*.css"),
  };

  const parsers = Parsers(config);

  const unused = await depcheck(pkg.root.absolute, {
    ...OPTIONS,
    ...options,
    parsers,
    // vitest is included in the root package.json, which is necessary to be able to run the tests
    // all at once and have them all use the same version of vitest. This is necessary because
    // vitest doesn't work properly when it's installed multiple times in the same project.
    ignoreMatches: ["vitest", ...pkg.used.flatMap((used) => used.packages)],
  });

  if (
    unused.dependencies.length === 0 &&
    unused.devDependencies.length === 0 &&
    Reflect.ownKeys(unused.missing).length === 0 &&
    Reflect.ownKeys(unused.invalidFiles).length === 0
  ) {
    workspace.reporter.verbose((r) => r.li("Clean", "ok"));
    return "success";
  }

  const reporter = new UnusedReporter(workspace, unused, pkg);

  await reporter.unused("Unused dependencies", unused.dependencies);
  await reporter.unused("Unused devDependencies", unused.devDependencies);
  await reporter.usage("Missing dependencies", unused.missing);

  await reporter.invalid("Invalid files", unused.invalidFiles);
  await reporter.invalid("Invalid directories", unused.invalidDirs);

  if (reporter.exitCode === 0) {
    return "success";
  } else {
    return "failure";
  }
}

class UnusedReporter {
  readonly #unused: depcheck.Results;
  readonly #package: Package;
  readonly #workspace: Workspace;
  #exitCode = 0;

  constructor(workspace: Workspace, unused: depcheck.Results, pkg: Package) {
    this.#workspace = workspace;
    this.#unused = unused;
    this.#package = pkg;
  }

  get exitCode(): number {
    return this.#exitCode;
  }

  get #reporter(): Reporter {
    return this.#workspace.reporter;
  }

  async unused(name: string, unused: string[]): Promise<void> {
    const filtered = unused.filter((dep) => {
      if (ALLOW_TYPE_ONLY.includes(dep)) {
        return false;
      } else if (dep.startsWith("@types/")) {
        return isTypePkgForPresentPkg(dep, this.#package);
      } else {
        return true;
      }
    });

    return PresentArray.from(filtered).andThen((present) => {
      this.#reporter.ul({
        header: name,
        items: present.map((dep) => listDep(dep)),
        style: "problem",
      });

      this.#exitCode = 1;
    });
  }

  async usage(name: string, usage: Record<string, string[]>): Promise<void> {
    const entries = Object.entries(usage);

    if (entries.length === 0) {
      return;
    }

    this.#reporter.group(name, { style: "problem" }).try((r) => {
      for (const [dep, files] of entries) {
        PresentArray.from(files).andThen((present) => {
          r.ul({
            header: `${Style.header("problem", listDep(dep))} ${Style.header(
              "comment",
              "is used by:"
            )}`,
            items: present.map((file) =>
              Style({ comment: this.#workspace.root.relativeTo(file) })
            ),
            marker: "comment",
          });
        });
      }
    });

    this.#exitCode = 1;
  }

  async invalid(name: string, invalid: Record<string, unknown>): Promise<void> {
    const entries = Object.entries(invalid);

    if (entries.length === 0) {
      return;
    }

    await this.#reporter.group(name).try(async (r) => {
      for (const [file, error] of entries) {
        r.ul({
          header: Style({ problem: this.#workspace.root.relativeTo(file) }),
          items: [String(error)],
          item: "comment",
        });
      }
    });

    this.#exitCode = 1;
  }
}

function isTypePkgForPresentPkg(dep: string, pkg: Package) {
  if (dep.startsWith("@types/")) {
    const name = formatPkgForTypePkg(dep);

    if (pkg.dependencies.has(name)) {
      return false;
    }
  }

  return true;
}

function formatPkgForTypePkg(pkg: string) {
  const withoutTypes = pkg.slice("@types/".length);

  if (withoutTypes.includes("__")) {
    return `@${withoutTypes.replace("__", "/")}`;
  } else {
    return withoutTypes;
  }
}

function listDep(dep: string) {
  if (dep.startsWith("@types/")) {
    return `${dep} (missing ${formatPkgForTypePkg(dep)})`;
  } else {
    return dep;
  }
}
