import depcheck from "depcheck";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Package } from "./packages.js";
import { comment, header, log, ok, problem } from "./log.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const OPTIONS: depcheck.Options = {
  ignoreDirs: ["dist"],
  ignoreBinPackage: false, // ignore the packages with bin entry
  skipMissing: false, // skip calculation of missing dependencies
  ignorePatterns: [],
  // ignoreMatches: [
  //   // all of these are used by the TypeScript plugin in rollup
  //   "@babel/plugin-proposal-decorators",
  //   "@babel/plugin-syntax-dynamic-import",
  //   "@babel/plugin-transform-runtime",
  //   "@babel/preset-env",
  //   "@babel/preset-typescript",

  //   // used by vite.config.ts
  //   "vite",

  //   // used by .changeset/config.json
  //   "@changesets/cli",

  //   // used in package.json scripts
  //   "esno",

  //   // used to build packages
  //   "typescript",
  //   "tslib",
  // ],
  parsers: {
    // the target parsers
    "**/*.js": depcheck.parser.es6,
    "**/*.mjs": depcheck.parser.es6,
    "**/*.jsx": depcheck.parser.jsx,
    "**/*.ts": depcheck.parser.typescript,
    "**/*.tsx": depcheck.parser.typescript,
    "**/*.css": depcheck.parser.sass,
  },
  detectors: [
    // the target detectors
    depcheck.detector.requireCallExpression,
    depcheck.detector.importDeclaration,
  ],
  specials: [
    // the target special parsers
    depcheck.special.eslint,
    depcheck.special.babel,
  ],
};

export async function checkUnused({
  pkg,
  verbose,
  stylish,
  options,
}: {
  pkg: Package;
  verbose: boolean;
  stylish: boolean;
  options?: depcheck.Options;
}): Promise<"success" | "failure"> {
  const unused = await depcheck(pkg.root.absolute, {
    ...OPTIONS,
    ...options,
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
    log("- Clean", ok);
    return "success";
  }

  const reporter = new Reporter(verbose, stylish);

  reporter.unused("Unused dependencies", unused.dependencies);
  reporter.unused("Unused devDependencies", unused.devDependencies);
  reporter.usage("Missing dependencies", unused.missing);

  reporter.invalid("Invalid files", unused.invalidFiles);
  reporter.invalid("Invalid directories", unused.invalidDirs);
  return "failure";
}

class Reporter {
  readonly #verbose: boolean;
  readonly #stylish: boolean;

  constructor(verbose: boolean, stylish: boolean) {
    this.#verbose = verbose;
    this.#stylish = stylish;
  }

  unused(name: string, unused: string[]): void {
    this.#group(unused, header(name), {
      each: (dep) => log(`- ${dep}`, problem),
      empty: () => log("- None", ok),
    });
  }

  usage(name: string, usage: Record<string, string[]>): void {
    const entries = Object.entries(usage);

    this.#group(entries, header(name), {
      each: ([dep, files]) => {
        console.group(problem(dep, { header: true }), comment("used in"));
        for (const file of files) {
          log(`- ${relative(root, file)}`, comment);
        }
        console.groupEnd();
      },
      empty: () => log("- None", ok),
    });
  }

  invalid(name: string, invalid: Record<string, unknown>): void {
    const entries = Object.entries(invalid);

    this.#group(entries, header(name), {
      each: ([file, error]) => {
        console.group(problem(relative(root, file), { header: true }));
        log(`- ${error}`, comment);
        console.groupEnd();
      },
      empty: () => log("- None", ok),
    });
  }

  #group<T>(
    items: T[],
    header: string,
    { each, empty }: { each: (item: T) => void; empty: () => void }
  ): void {
    if (items.length === 0 && !this.#verbose) {
      return;
    }

    console.group(header);

    if (items.length === 0) {
      empty();
    } else {
      for (const item of items) {
        each(item);
      }
    }
    console.groupEnd();
  }
}
