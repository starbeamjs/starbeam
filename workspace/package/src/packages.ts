import { isPresentArray } from "@starbeam/core-utils";
import { type Path, Directory } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";
import sh from "shell-escape-tag";

import type { Dependencies } from "./dependencies";
import { Package } from "./package";
import { Query } from "./query/query.js";
import type { StarbeamSources, StarbeamType } from "./unions.js";
import { fatal } from "./utils.js";

export interface StarbeamTemplates {
  "package.json": string;
}

export interface StarbeamInfo {
  type: StarbeamType;
  source: StarbeamSources;
  used: Used[];
  templates: StarbeamTemplates;
}

export interface PackageInfo {
  manifest: Path;
  name: string;
  type: string;
  main?: string | undefined;
  root: string;
  isPrivate: boolean;
  isTypescript: boolean;
  starbeam: StarbeamInfo;
  scripts: Record<string, string>;
  tests: Record<string, string>;
  dependencies: Dependencies;
}

interface PnpmPackage {
  name: string;
  version: string;
  path: string;
  private: boolean;
}

export interface Used {
  reason: string;
  packages: string[];
}

export function queryPackages(
  workspace: Workspace,
  query: Query = Query.all
): Package[] {
  const packageList = workspace.cmd(sh`pnpm ls -r --depth -1 --json`);

  if (packageList === undefined) {
    fatal(workspace.reporter.fatal("Failed to list packages"));
  }

  const packages = JSON.parse(packageList) as PnpmPackage[];

  return packages
    .map((p) =>
      new Directory(workspace.root.absolute, p.path).file("package.json")
    )
    .map((manifest) => Package.from(workspace, manifest))
    .filter((pkg) => query.match(pkg, workspace.reporter));
}

export function formatKey(soFar: string[], key: string): string {
  if (isPresentArray(soFar)) {
    return `${soFar.join(".")}.${key}`;
  } else {
    return key;
  }
}
