import glob from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
interface Package {
  name: string;
  main: string;
  root: string;
}

export function packages(root: string): Package[] {
  return glob
    .sync([
      resolve(root, "packages/*/package.json"),
      resolve(root, "framework/*/*/package.json"),
    ])
    .map((path) => [path, JSON.parse(readFileSync(path, "utf8"))])
    .filter(([, pkg]) => pkg.main && pkg.private !== true)
    .map(([path, pkg]) => {
      const root = dirname(path);
      return { name: pkg.name, main: resolve(root, pkg.main), root };
    });
}
