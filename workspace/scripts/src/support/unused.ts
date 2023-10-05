import {
  ifPresentArray,
  isEmptyArray,
  objectHasKeys,
  stringify,
} from "@starbeam/core-utils";
import type { Package } from "@starbeam-workspace/package";
import type { Glob, Globs, RegularFile } from "@starbeam-workspace/paths";
import type { Reporter, Workspace } from "@starbeam-workspace/reporter";
import { Fragment } from "@starbeam-workspace/reporter";
import { PresentArray } from "@starbeam-workspace/shared";
import depcheck from "depcheck";

/**
 * These types represent builtin APIs that don't require an implementation package.
 */
const ALLOW_TYPE_ONLY = ["@types/node"];

type ParserName = keyof typeof depcheck.parser;

export type ParserConfig = Globs<RegularFile> | Glob<RegularFile> | undefined;

export type ParsersConfig = {
  [P in ParserName]?: ParserConfig;
};

function Parsers(options: ParsersConfig): Record<string, depcheck.Parser> {
  const parsers: Record<string, depcheck.Parser> = {};

  for (const [parser, globs] of Object.entries(options) as [
    ParserName,
    Glob | Globs,
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

const SUCCESS_CODE = 0;

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
    sass: pkg.root.glob("**/*.css", { match: ["files"] }),
  } satisfies ParsersConfig;

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
    isEmptyArray(unused.dependencies) &&
    isEmptyArray(unused.devDependencies) &&
    !objectHasKeys(unused.missing) &&
    !objectHasKeys(unused.invalidFiles)
  ) {
    workspace.reporter.verbose((r) => {
      r.li("Clean", "ok");
    });
    return "success";
  }

  const reporter = new UnusedReporter(workspace, pkg);

  reporter.unused("Unused dependencies", unused.dependencies);
  reporter.unused("Unused devDependencies", unused.devDependencies);
  reporter.usage("Missing dependencies", unused.missing);

  reporter.invalid("Invalid files", unused.invalidFiles);
  reporter.invalid("Invalid directories", unused.invalidDirs);

  if (reporter.isOk) {
    return "success";
  } else {
    return "failure";
  }
}

class UnusedReporter {
  readonly #package: Package;
  readonly #workspace: Workspace;
  #exitCode = SUCCESS_CODE;

  constructor(workspace: Workspace, pkg: Package) {
    this.#workspace = workspace;
    this.#package = pkg;
  }

  get isOk(): boolean {
    return this.#exitCode === SUCCESS_CODE;
  }

  get #reporter(): Reporter {
    return this.#workspace.reporter;
  }

  unused(name: string, unused: string[]): void {
    const filtered = unused.filter((dep) => {
      if (ALLOW_TYPE_ONLY.includes(dep)) {
        return false;
      } else if (dep.startsWith("@types/")) {
        return isTypePkgForPresentPkg(dep, this.#package);
      } else {
        return true;
      }
    });

    PresentArray.from(filtered).ifPresent((present) => {
      this.#reporter.ensureBreak();

      this.#reporter.ul({
        header: name,
        items: present.map((dep) => listDep(dep)),
        style: "problem",
      });

      this.#exitCode = 1;
    });
  }

  usage(name: string, usage: Record<string, string[]>): void {
    ifPresentArray(Object.entries(usage), (entries) => {
      this.#reporter.ensureBreak();

      this.#reporter.group(Fragment.problem.header(name)).try((r) => {
        for (const [dep, files] of entries) {
          PresentArray.from(files).ifPresent((present) => {
            r.ul({
              header: stringify`${Fragment.problem(
                listDep(dep),
              )} ${Fragment.comment.header("is used by:")}`,
              items: present.map((file) =>
                this.#workspace.root.navigateTo(file),
              ),
              style: "problem",
            });
          });
        }
      });

      this.#exitCode = 1;
    });
  }

  invalid(name: string, invalid: Record<string, unknown>): void {
    ifPresentArray(Object.entries(invalid), (entries) => {
      this.#reporter.ensureBreak();

      this.#reporter.group(name).try((r) => {
        for (const [file, error] of entries) {
          r.ul({
            header: Fragment.problem(this.#workspace.root.navigateTo(file)),
            items: [String(error)],
            item: "comment",
          });
        }
      });

      this.#exitCode = 1;
    });
  }
}

function isTypePkgForPresentPkg(dep: string, pkg: Package): boolean {
  if (dep.startsWith("@types/")) {
    const name = formatPkgForTypePkg(dep);

    if (pkg.dependencies.has(name)) {
      return false;
    }
  }

  return true;
}

function formatPkgForTypePkg(pkg: string): string {
  const withoutTypes = pkg.slice("@types/".length);

  if (withoutTypes.includes("__")) {
    return `@${withoutTypes.replace("__", "/")}`;
  } else {
    return withoutTypes;
  }
}

function listDep(dep: string): string {
  if (dep.startsWith("@types/")) {
    return `${dep} (missing ${formatPkgForTypePkg(dep)})`;
  } else {
    return dep;
  }
}
