import glob from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { Query } from "./query.js";
export interface Package {
  name: string;
  main: string;
  root: string;
  isPrivate: boolean;
  isTypescript: boolean;
  tsconfig: string | undefined;
}

export function queryPackages(
  root: string,
  query: Query = Query.all
): Package[] {
  return glob
    .sync([
      resolve(root, "packages/*/package.json"),
      resolve(root, "framework/*/*/package.json"),
      resolve(root, "demos/*/package.json"),
    ])
    .map((path) => [path, JSON.parse(readFileSync(path, "utf8"))])
    .filter(([, pkg]) => pkg.main)
    .map(([path, pkg]) => {
      const root = dirname(path);
      return {
        name: pkg.name,
        main: resolve(root, pkg.main),
        root,
        isPrivate: !!pkg.private,
        isTypescript: !!(pkg.type || pkg?.exports?.["."]?.types),
        tsconfig: pkg["starbeam:tsconfig"],
      };
    })
    .filter((pkg) => query.match(pkg));
}

export function getPackages(
  root: string,
  name: string,
  scope?: string
): Package[] {
  const all = queryPackages(root);

  if (name === "any") {
    return all;
  }

  const pkgName = normalizePackageName(name, scope);

  return all.filter((pkg) => pkg.name === pkgName);
}

function normalizePackageName(name: string, scope: string | undefined): string {
  if (name === "all") {
    return "all";
  } else if (name.startsWith("@") || scope === undefined) {
    return name;
  } else {
    return `@${scope}/${name}`;
  }
}
