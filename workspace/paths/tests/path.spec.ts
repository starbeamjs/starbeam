import {
  type Directory,
  type Path,
  StrictNavigationError,
  WorkspaceRoot,
} from "@starbeam-workspace/paths";
import { describe, expect, test } from "@starbeam-workspace/test-utils";
import { basename, dirname, join } from "path";
import { inspect } from "util";

// pathSuite({
//   name: "Non-root Directory",
//   create: (root, name) => root.dir(name),
//   tests: (path) => {
//     test("custom inspect is relative to the root", () => {
//       expect(inspect(path)).toBe(
//         `${path[Symbol.toStringTag]}(${path.relative} from ${
//           path.root.relativeFromWorkspace
//         })`,
//       );
//     });
//   },
// });

// pathSuite({
//   name: "RegularFile",
//   create: (root, name) => root.file(name),
// });

const WORKSPACE = WorkspaceRoot.at("/tmp/diskfile");
const pkgDir = WORKSPACE.dir("packages/core", { as: "root" });
const srcDir = pkgDir.dir("src");

describe("root directories", () => {
  const context = new SuiteContext(WORKSPACE, {
    path: pkgDir,
    label: "Directory[root]",
    parts: {
      workspace: "/tmp/diskfile",
      root: "packages/core",
      relative: undefined,
    },
  });

  pathPropertiesSuite(context);
  navigationSuite(context);
  dirSuite(context);

  test("relative path is undefined for a root", () => {
    expect(pkgDir.relative).toBe(undefined);
  });

  test("custom inspect is relative to the workspace root and identifies it as a root", () => {
    expect(inspect(pkgDir)).toBe(`Directory[root](packages/core)`);
  });
});

describe("directories", () => {
  const context = new SuiteContext(WORKSPACE, {
    path: srcDir,
    label: "Directory",
    parts: {
      workspace: "/tmp/diskfile",
      root: "packages/core",
      relative: "src",
    },
  });

  pathPropertiesSuite(context);
  dirSuite(context);
});

function navigationSuite(context: SuiteContext<Path>) {
  const { path, expected } = context;

  describe(`${context.label} Path Navigation`, () => {
    describe("navigateFrom", () => {
      const descendant = context.child("child");

      test("from an ancestor", () => {
        expect(descendant.navigateFrom(context.path)).toBe("child");
      });

      test("from a descendant", () => {
        expect(path.navigateFrom(descendant)).toBe("..");
      });

      test("from itself", () => {
        expect(path.navigateFrom(context.path)).toBe("");
      });

      test("from the workspace root", () => {
        expect(path.navigateFrom(path.workspace)).toBe(
          expected.relative.fromWorkspace,
        );
      });
    });

    describe("navigateTo", () => {
      const descendant = context.child("child");

      test("to a descendant", () => {
        expect(path.navigateTo(descendant)).toBe("child");
      });

      test("to an ancestor", () => {
        expect(descendant.navigateTo(path)).toBe("..");
      });

      test("to itself", () => {
        expect(path.navigateTo(path)).toBe("");
      });

      test("to a child from the workspace root", () => {
        expect(path.workspace.root.navigateTo(path)).toBe(
          expected.relative.fromWorkspace,
        );
      });
    });

    describe(".parent", () => {
      test("absolute path", () => {
        expect(path.parent.absolute).toBe(expected.dirname);
      });

      if (context.isNestedInRoot) {
        test("if the parent is still inside the same root, the parent Path should also have that root", () => {
          expect(path.parent.root.absolute).toBe(path.root.absolute);
        });
      }

      describe("outside the current root (but in the workspace root)", () => {
        const parent = context.escape.root();
        test("absolute path", () => {
          expect(parent.absolute).toBe(dirname(expected.root));
        });

        test("the root is the workspace root", () => {
          expect(parent.root.absolute).toBe(expected.workspaceRoot);
        });
      });

      describe("outside the workspace root", () => {
        const parent = context.escape.workspace();
        test("absolute path", () => {
          expect(parent.absolute).toBe(dirname(expected.workspaceRoot));
        });

        test("the root is the system root", () => {
          expect(parent.root.absolute).toBe("/");
        });
      });

      describe("a strict path", () => {
        test("does not allow navigating outside the root", () => {
          const strict = path.root.strict();

          expect(strict.absolute).toBe(expected.root);

          expect(() => strict.parent).toThrow(StrictNavigationError);
        });
      });
    });
  });
}

function pathPropertiesSuite(context: SuiteContext<Path>) {
  const { path, expected } = context;

  test("absolute path", () => {
    expect(path.absolute).toBe(expected.absolute);
  });

  test("relativeToWorkspace", () => {
    expect(path.relativeFromWorkspace).toBe(expected.relative.fromWorkspace);
  });

  test("relative", () => {
    expect(path.relative).toBe(expected.relative.fromRoot);
  });

  test("basename", () => {
    expect(path.basename).toBe(expected.basename);
  });

  test("dirname", () => {
    expect(path.dirname).toBe(expected.dirname);
  });

  test("the path of a root's root is its absolute path", () => {
    expect(path.root.absolute).toBe(expected.root);
  });

  test("workspaceRoot", () => {
    expect(path.workspace.absolute).toBe(expected.workspaceRoot);
  });
}

function dirSuite(context: SuiteContext<Directory>) {
  const { path, expected } = context;

  describe("dir", () => {
    describe("in the same root", () => {
      const child = path.dir("child");
      test("absolute path", () => {
        expect(child.absolute).toBe(context.join("child"));
      });

      test("the root defaults to the original root", () => {
        expect(child.root.absolute).toBe(expected.root);
      });

      test("the workspace root remains the same", () => {
        expect(child.workspace.absolute).toBe(expected.workspaceRoot);
      });
    });

    describe("{ as: 'root' }", () => {
      const child = path.dir("child", { as: "root" });

      test("absolute path", () => {
        expect(child.absolute).toBe(context.join("child"));
      });

      test("the root is the new directory", () => {
        expect(child.root.absolute).toBe(context.join("child"));
      });

      test("the workspace root remains the same", () => {
        expect(child.workspace.absolute).toBe(expected.workspaceRoot);
      });
    });
  });
}

interface SuiteOptions<P extends Path> {
  path: P;
  label: string;
  parts: {
    workspace: string;
    root: string;
    relative: string | undefined;
  };
}

class SuiteContext<P extends Path> {
  readonly path: P;
  readonly label: string;
  readonly parts: {
    workspace: string;
    root: string;
    relative: string | undefined;
  };

  #workspace: WorkspaceRoot;

  constructor(
    workspace: WorkspaceRoot,
    { path, label, parts }: SuiteOptions<P>,
  ) {
    this.#workspace = workspace;
    this.path = path;
    this.label = label;
    this.parts = parts;
  }

  readonly escape = {
    root: () => {
      return this.#workspace.dir(dirname(this.path.root.absolute));
    },

    workspace: () => {
      return WorkspaceRoot.system.dir(dirname(this.path.workspace.absolute));
    },
  };

  get isNestedInRoot(): boolean {
    return this.path.relative !== undefined;
  }

  get expected() {
    const { workspace, root, relative } = this.parts;

    const fromWorkspace = relative ? join(root, relative) : root;

    const absolute = join(workspace, fromWorkspace);

    return {
      absolute: absolute,
      basename: basename(absolute),
      dirname: dirname(absolute),
      workspaceRoot: workspace,
      root: join(workspace, root),
      relative: {
        fromWorkspace,
        fromRoot: relative,
      },
    };
  }

  join(child: string): string {
    return join(this.expected.absolute, child);
  }

  child(child: string): Path {
    return this.path.join(child);
  }
}
