import { basename, join } from "node:path";

import type { DirLike, Glob, GlobMatch, Path } from "@starbeam-workspace/paths";
import { NavigationError, WorkspacePath } from "@starbeam-workspace/paths";
import { custom, describe, test } from "@starbeam-workspace/test-utils";

const __dirname = new URL(".", import.meta.url).pathname;
const testRoot = join(__dirname, ".fixtures");

describe("globs", () => {
  const workspace = WorkspacePath.at(join(testRoot, "workspace"));

  const PATHS = {
    workspace: workspace,
    root: workspace.dir("core", { as: "root" }),
    subdir: WorkspacePath.at(testRoot)
      .dir("workspace", { as: "root" })
      .dir("core"),
  };

  interface TestCase {
    label: string;
    path: DirLike;
    description: string;
    relative: (path: string) => string;
    cases: {
      static: string[];
      all: Record<string, string[]>;
      directories: Record<string, string[]>;
      files: Record<string, string[]>;
    };
  }

  const JSONS = [".eslintrc.json", "package.json", "tsconfig.json"];

  const CASES = {
    static: JSONS,
    all: {
      "*.json": JSONS,
      "**/*.json": [...JSONS, ...JSONS.map((j) => `tests/${j}`)],
      "**/*.spec.ts": [
        "tests/cell.spec.ts",
        "tests/collection.spec.ts",
        "tests/formula.spec.ts",
      ],
    },
    directories: {
      "*": ["src", "tests"],
    },
    files: {
      "*": ["index.ts", ...JSONS],
    },
  };

  const PATH_LIKES: TestCase[] = [
    {
      label: "WorkspacePath",
      path: workspace,
      description: "the workspace root",
      relative: (path: string) => `core/${path}`,
      cases: CASES,
    },
    {
      label: "Directory at the workspace root",
      path: workspace.root,
      description: "the workspace root",
      relative: (path: string) => `core/${path}`,
      cases: CASES,
    },
    {
      label: "Directory at a package root",
      path: workspace.dir("core", { as: "root" }),
      description: PATHS.root.relativeFromWorkspace,
      relative: (path: string) => path,
      cases: CASES,
    },
    {
      label: "Directory at a subdirectory",
      path: PATHS.subdir,
      description: `${PATHS.subdir.relative} in ${PATHS.subdir.root.relativeFromWorkspace}`,
      relative: (path: string) => path,
      cases: CASES,
    },
  ];

  describe("Glob", () => {
    for (const { label, path, description, relative, cases } of PATH_LIKES) {
      describe(label, () => {
        describe("static paths used as globs", () => {
          for (const label of cases.static) {
            const file = relative(label);
            describe(label, () => {
              test(`without a . prefix (.glob("${file}"))`, () => {
                const manifests = path.glob(file);
                expect(manifests).toHavePaths([path.file(file)]);
              });
            });

            test(`with a . prefix (.glob("./${file}"))`, () => {
              const manifests = path.glob(`./${file}`);

              expect(manifests).toHavePaths([path.file(file)]);
            });
          }
        });

        describe("dynamic globs", () => {
          const DYNAMIC_CASES = ["all", "directories", "files"] as const;

          for (const caseName of DYNAMIC_CASES) {
            const matches: GlobMatch[] =
              caseName === "all" ? ["files", "directories"] : [caseName];
            for (const [label, files] of Object.entries(cases[caseName])) {
              const file = relative(label);
              const expected = {
                withHidden: files.map((file) =>
                  path.join(relative(file)).reify(),
                ),
                withoutHidden: files.flatMap((file) =>
                  basename(file).startsWith(".")
                    ? []
                    : [path.join(relative(file)).reify()],
                ),
              };

              test(`glob(${label}, { match: ${JSON.stringify(
                matches,
              )} })`, () => {
                expect(
                  path.glob(file, {
                    allow: ["hidden"],
                    match: matches,
                  }),
                ).toHavePaths(expected.withHidden);

                expect(
                  path.glob(`./${file}`, { allow: ["hidden"], match: matches }),
                ).toHavePaths(expected.withHidden);

                expect(path.glob(file, { match: matches })).toHavePaths(
                  expected.withoutHidden,
                );

                expect(path.glob(`./${file}`, { match: matches })).toHavePaths(
                  expected.withoutHidden,
                );
              });
            }
          }
        });

        test("attempting to navigate to a parent directory", () => {
          expect(() => {
            path.glob("..").expand();
          }).toThrowErrorMatchingInlineSnapshot(oneline`
              "Attempted to create a glob (\`.glob()\`) to .. from a Directory
              (${description}). However, the destination path is not nested
              within the source path (${path.absolute}). Calls to \`.glob()\` may
              not have leading \`..\` segments."
            `);

          expect(() => {
            path.glob("core/../core/package.json").expand();
          }).toThrow(NavigationError);
        });
      });
    }
  });
});

interface PathParts {
  type: string;
  workspace: string;
  root: string;
  relative: string | undefined;
}

function PathParts(path: Path): PathParts {
  return {
    type: path[Symbol.toStringTag],
    workspace: path.workspace.absolute,
    root: path.root.absolute,
    relative: path.relative,
  };
}

const expect = custom({
  toHavePaths: (actual: Glob, expected: Path[], utils) => {
    const actualPaths = actual
      .expand()
      .sort((a, b) => a.absolute.localeCompare(b.absolute));
    const expectedPaths = expected.sort((a, b) =>
      a.absolute.localeCompare(b.absolute),
    );

    const actualParts = actualPaths.map(PathParts);
    const expectedParts = expectedPaths.map(PathParts);

    const actualDescription = actualPaths.map((path) =>
      path.toString({ as: "description" }),
    );
    const expectedDescription = expectedPaths.map((path) =>
      path.toString({ as: "description" }),
    );

    const eql = utils.equals(actualParts, expectedParts, undefined, true);
    const eqlDescs = utils.equals(actualDescription, expectedDescription);

    return {
      pass: eql,
      actual: eqlDescs ? actualParts : actualDescription,
      expected: eqlDescs ? expectedParts : expectedDescription,
      message: () =>
        `Expected ${actual.toString({
          as: "description",
        })} to have the specified paths`,
    };
  },
});

function oneline(raw: TemplateStringsArray, ...args: unknown[]): string {
  let out = "";

  raw.forEach((item, i) => {
    out += item;
    const arg = args[i];

    if (arg !== undefined) {
      out += String(arg);
    }
  });

  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");
}
