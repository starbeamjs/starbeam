import { firstNItems } from "@starbeam/core-utils";

const _SOURCE_PARTS =
  /^(?![a-z]+:)(?:(?<scope>@[^/\\]+)[/])?(?<name>[^/\\]+)(?:[/\\](?<path>.*))?$/;

const _RELATIVE_MODULE = /^\.{1,2}\//;

export function parseModule(filename: string, codebase?: string): ParsedModule {
  return normalizeModule(filename, codebase);

  // FIXME:: Do we want/need to support package inference? If so, how should it work?

  // if (RELATIVE_MODULE.exec(filename))

  // const groups = SOURCE_PARTS.exec(filename)?.groups;

  // if (groups === undefined) return normalizeModule(filename, codebase);

  // return {
  //   root: {
  //     type: "package",
  //     scope: groups["scope"],
  //     name: verified(groups["name"], isPresent),
  //   },
  //   path: verified(groups["path"], isPresent),
  // };
}

export interface ParsedModule {
  root?: string | { package: string } | undefined;
  path: string;
}

export function normalizeModule(
  filename: string,
  codebase?: string | undefined
): ParsedModule {
  const path = normalizePath(filename);

  if (codebase) {
    const { prefix, suffix } = pivotPath(codebase, path);
    console.log({ codebase, path, prefix, suffix });
    return {
      root: prefix,
      path: stripLeadingSlash(suffix),
    };
  }

  return { path };
}

function stripLeadingSlash(path: string) {
  return path.startsWith("/") ? path.slice("/".length) : path;
}

/**
 * The whole `Stack` system is only intended to be used for logging, so the
 * edge-cases where this normalization wouldn't work (verbatim paths on Windows)
 * shouldn't matter.
 */
function normalizePath(...pathParts: (string | null | undefined)[]): string {
  return pathParts
    .filter((part): part is string => typeof part === "string")
    .map((p: string) => p.replaceAll(/[\\]/g, "/"))
    .join("/");
}

/**
 * This function takes two paths and returns the suffix of the target that comes
 * after any shared prefix with the source.
 *
 * For example, if the source is `/src/app/foo/bar` and the target is
 * `/src/app/baz/qux`, this function will return `baz/qux`.
 */
export function pivotPath(
  source: string,
  target: string
): { prefix: string; suffix: string } {
  const sourceParts = source.split("/");
  const targetParts = target.split("/");

  const pivotIndex = sourceParts.findIndex((part, index) => {
    return part !== targetParts[index];
  });

  return {
    prefix: firstNItems(sourceParts, pivotIndex).join("/") + "/",
    suffix: targetParts.slice(pivotIndex).join("/"),
  };
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test("should return the path if it's not nested in a root", () => {
    expect(normalizeModule("./foo/bar")).toStrictEqual({
      path: "./foo/bar",
    });
    expect(parseModule("./foo/bar")).toStrictEqual({
      path: "./foo/bar",
    });
  });

  test("should find the pivot path", () => {
    expect(
      normalizeModule("/src/app/index.ts", "/src/app/some/nested/file.ts")
    ).toStrictEqual({
      root: "/src/app/",
      path: "index.ts",
    });
    expect(
      parseModule("/src/app/index.ts", "/src/app/some/nested/file.ts")
    ).toStrictEqual({
      root: "/src/app/",
      path: "index.ts",
    });
  });

  test("pivotPath", () => {
    expect(pivotPath("/src/app/foo/bar", "/src/app/baz/qux")).toEqual({
      prefix: "/src/app/",
      suffix: "baz/qux",
    });
  });
}
