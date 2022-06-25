import glob from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
export interface Package {
  name: string;
  main: string;
  root: string;
  isPrivate: boolean;
  isTypescript: boolean;
}

export function packages(
  root: string,
  { include }: { include: "private"[] } = { include: [] }
): Package[] {
  return glob
    .sync([
      resolve(root, "packages/*/package.json"),
      resolve(root, "framework/*/*/package.json"),
    ])
    .map((path) => [path, JSON.parse(readFileSync(path, "utf8"))])
    .filter(
      ([, pkg]) =>
        pkg.main && (include.includes("private") || pkg.private !== true)
    )
    .map(([path, pkg]) => {
      const root = dirname(path);
      return {
        name: pkg.name,
        main: resolve(root, pkg.main),
        root,
        isPrivate: pkg.private,
        isTypescript: !!(pkg.type || pkg?.exports?.["."]?.types),
      };
    });
}

export function getPackages(
  root: string,
  name: string,
  scope?: string
): Package[] {
  const all = packages(root);

  if (name === "all") {
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
