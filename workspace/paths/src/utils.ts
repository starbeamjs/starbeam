import { isAbsolute, resolve as nodeResolve } from "node:path";

import type { Options as FastGlobOptions } from "fast-glob";

export type GlobMatch = "files" | "directories";

export function includeOptions(include?: GlobMatch[]): FastGlobOptions {
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

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

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
