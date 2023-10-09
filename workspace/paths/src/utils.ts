import type { Dirent } from "node:fs";
import { isAbsolute, relative, resolve as nodeResolve } from "node:path";

import type { Options as FastGlobOptions } from "fast-glob";

import type { GlobAllow, GlobOptions } from "../index.js";

export type GlobMatch = "files" | "directories";

export function includeOptions(options?: GlobOptions): FastGlobOptions {
  const matches = includeMatches(options?.match);
  const allows = includeAllows(options?.allow);

  return {
    ...matches,
    ...allows,
  };
}

function includeAllows(include?: GlobAllow[]): FastGlobOptions {
  return { dot: include?.includes("hidden") ?? false };
}

function includeMatches(include?: GlobMatch[]): FastGlobOptions {
  if (include === undefined) {
    return { onlyDirectories: false, onlyFiles: false };
  }

  const options: FastGlobOptions = {};

  if (include.includes("files") && include.includes("directories")) {
    options.onlyDirectories = false;
    options.onlyFiles = false;
  } else if (include.includes("files")) {
    options.onlyFiles = true;
  } else if (include.includes("directories")) {
    options.onlyDirectories = true;
  }

  return options;
}

type DirEntry = Pick<
  Dirent,
  | "isBlockDevice"
  | "isCharacterDevice"
  | "isDirectory"
  | "isFIFO"
  | "isFile"
  | "isSocket"
  | "isSymbolicLink"
>;

export function classify(entry: DirEntry): string {
  if (entry.isBlockDevice()) {
    return "block device";
  } else if (entry.isCharacterDevice()) {
    return "character device";
  } else if (entry.isDirectory()) {
    return "directory";
  } else if (entry.isFIFO()) {
    return "FIFO";
  } else if (entry.isFile()) {
    return "file";
  } else if (entry.isSocket()) {
    return "socket";
  } else if (entry.isSymbolicLink()) {
    return "symbolic link";
  } else {
    return "unknown file";
  }
}

export function isArray<T>(value: unknown): value is readonly T[];
export function isArray<T>(value: unknown): value is T[];
export function isArray(value: unknown): value is unknown[];
export function isArray(value: unknown): boolean {
  return Array.isArray(value);
}

/**
 * Convert a path separated with `/` (the API for this package) to a list of path segments.
 *
 * This means that `\` will be treated as a normal character (even on Windows), which means that
 * this API doesn't support verbatim paths (paths starting with `\\?\`).
 *
 * This API removes leading `/`s, trailing `/`s and condenses multiple `/`s into a single `/`.
 */
export function parts(path: string): string[] {
  return path.replace(/(^\/*|\/*$)/g, "").split(/\/+/);
}

export function join(...parts: string[]): string {
  return parts.join("/");
}

/**
 * Resolve and normalize a path relative to a root.
 *
 * If the root is absolute, then resolve the path relative to the root,
 * normalizing the resulting path in the same manner as `node:path.resolve`.
 *
 * If the root is relative, then join the path relative to the root, normalizing
 * the resulting path in the same manner as `node:path.join`.
 *
 * This basically means that multiple consecutive `/`s in the path will be condensed
 * into a single `/`, and that the root and path will be joined with a single
 * `/`, regardless of whether the root ends with a trailing `/` or the path
 * begins with a leading `/`.
 */
export function resolve(root: string, path: string): string {
  if (isAbsolute(root)) {
    path = path.replace(/^\/?/, "");
    return nodeResolve(root, ...parts(path));
  } else {
    return join(...parts(root), ...parts(path));
  }
}

export function nullifyEmpty(path: string): string | undefined {
  return path === "" ? undefined : path;
}

type Position = "same" | "ancestor" | "descendant";

function comparePosition(a: string, b: string): Position | undefined {
  const comparison = relative(a, b);

  if (comparison === "") {
    return "same";
    // repeated ".."s separated by "/"s
  } else if (/^\.\.(\/\.\.)*$/.exec(comparison)) {
    return "ancestor";
  } else if (comparison.startsWith("..")) {
    return undefined;
  } else {
    return "descendant";
  }
}

/**
 * A possible child is contained within a parent if all of its files are
 * contained within the parent directory.
 *
 * This means that if both paths are the same, then the child is contained
 * within the parent.
 */
export function isContained(parent: string, possibleChild: string): boolean {
  const position = comparePosition(parent, possibleChild);

  return position === "same" || position === "descendant";
}

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  const TYPES = [
    "block device",
    "character device",
    "directory",
    "FIFO",
    "file",
    "socket",
    "symbolic link",
    "unknown file",
  ] as const;
  type DirentType = (typeof TYPES)[number];

  class FakeDirent implements DirEntry {
    #type: DirentType;

    constructor(type: DirentType) {
      this.#type = type;
    }

    isBlockDevice(): boolean {
      return this.#type === "block device";
    }
    isCharacterDevice(): boolean {
      return this.#type === "character device";
    }
    isDirectory(): boolean {
      return this.#type === "directory";
    }
    isFIFO(): boolean {
      return this.#type === "FIFO";
    }
    isFile(): boolean {
      return this.#type === "file";
    }
    isSocket(): boolean {
      return this.#type === "socket";
    }
    isSymbolicLink(): boolean {
      return this.#type === "symbolic link";
    }
  }

  describe("classify", () => {
    for (const type of TYPES) {
      test(`a ${type}`, () => {
        expect(classify(new FakeDirent(type))).toEqual(type);
      });
    }
  });

  describe("comparePosition and isContained", () => {
    const DESCENDANT_CASES = [
      ["/", "/a"],
      ["/", "/a/b/c"],
      ["/a/b", "/a/b/c"],
      ["/a/b", "/a/b/c/d"],
    ] as const;

    const SAME_CASES = [
      ["/", "/"],
      ["/a", "/a"],
      ["/a/b", "/a/b"],
      ["/a/b/c", "/a/b/c"],
      ["/a/b/c/d", "/a/b/c/d"],
    ] as const;

    for (const [ancestor, descendant] of DESCENDANT_CASES) {
      test(`"${ancestor}" is a descendant of "${descendant}"`, () => {
        expect(comparePosition(ancestor, descendant)).toBe("descendant");
        expect(isContained(ancestor, descendant)).toBe(true);
      });

      test(`"${descendant}" is an ancestor of "${ancestor}"`, () => {
        expect(comparePosition(descendant, ancestor)).toBe("ancestor");
        expect(isContained(descendant, ancestor)).toBe(false);
      });
    }

    for (const [a, b] of SAME_CASES) {
      test(`"${a}" is the same as "${b}"`, () => {
        expect(comparePosition(a, b)).toBe("same");
        expect(isContained(a, b)).toBe(true);
      });
    }
  });

  describe("parts", () => {
    test("with a leading /", () => {
      expect(parts("/a/b/c")).toEqual(["a", "b", "c"]);
    });

    test("with a trailing /", () => {
      expect(parts("/a/b/c/")).toEqual(["a", "b", "c"]);
    });

    test("with multiple '/'s", () => {
      expect(parts("/a/b//c")).toEqual(["a", "b", "c"]);
    });
  });

  describe("baseline node resolve assumptions", () => {
    test("with a leading / as the root", () => {
      expect(nodeResolve("/", "a", "b", "c")).toBe("/a/b/c");
    });
  });

  describe("resolve", () => {
    describe("absolute root", () => {
      test("with a leading / in the path", () => {
        expect(resolve("/", "/a/b/c")).toEqual("/a/b/c");
      });

      test("with a trailing / in the root and a leading / in the path", () => {
        expect(resolve("/a/b/", "/c")).toEqual("/a/b/c");
      });

      test("with a trailing / in the root and no leading / in the path", () => {
        expect(resolve("/a/b/", "c/d/")).toEqual("/a/b/c/d");
      });

      test("with a trailing / in the path", () => {
        expect(resolve("/a/b", "/c/d/")).toEqual("/a/b/c/d");
      });

      test("with multiple '/'s next to each other in the root", () => {
        expect(resolve("/a/b//c", "/d/e/f")).toEqual("/a/b/c/d/e/f");
      });

      test("with multiple '/'s next to each other in the path", () => {
        expect(resolve("/a/b", "/c/d//e/f")).toEqual("/a/b/c/d/e/f");
      });

      test("with multiple superfluous slashes in the path", () => {
        expect(resolve("/a//b/", "/c//d/e/f/")).toEqual("/a/b/c/d/e/f");
      });

      test("with superflous slashes at the beginning of the root", () => {
        expect(resolve("//a/b", "/c/d/e/f")).toEqual("/a/b/c/d/e/f");
      });

      test("with superflous slashes at the beginning of the path", () => {
        expect(resolve("/a/b", "//c/d/e/f")).toEqual("/a/b/c/d/e/f");
      });
    });

    describe("relative root", () => {
      test("without a leading / in the root and a leading / in the path", () => {
        expect(resolve("a/b", "/c/d")).toEqual("a/b/c/d");
      });

      test("with a trailing / in the root and a leading / in the path", () => {
        expect(resolve("a/b/", "/c")).toEqual("a/b/c");
      });

      test("with a trailing / in the root and no leading / in the path", () => {
        expect(resolve("a/b/", "c/d/")).toEqual("a/b/c/d");
      });

      test("with a trailing / in the path", () => {
        expect(resolve("a/b", "/c/d/")).toEqual("a/b/c/d");
      });

      test("with multiple '/'s next to each other in the root", () => {
        expect(resolve("a/b//c", "/d/e/f")).toEqual("a/b/c/d/e/f");
      });

      test("with multiple '/'s next to each other in the path", () => {
        expect(resolve("a/b", "/c/d//e/f")).toEqual("a/b/c/d/e/f");
      });

      test("with multiple superfluous slashes in the path", () => {
        expect(resolve("a//b/", "/c//d/e/f/")).toEqual("a/b/c/d/e/f");
      });

      test("with superflous slashes at the beginning of the path", () => {
        expect(resolve("a/b", "//c/d/e/f")).toEqual("a/b/c/d/e/f");
      });
    });
  });
}
