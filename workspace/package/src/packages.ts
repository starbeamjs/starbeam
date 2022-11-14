import { isPresentArray } from "@starbeam/core-utils";
import { type Path, Directory } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";
import { DisplayStruct, Union } from "@starbeam-workspace/shared";
import sh from "shell-escape-tag";

import type { Dependencies } from "./dependencies";
import { Package } from "./package";
import { Query } from "./query/query.js";
import type { StarbeamSources, StarbeamType } from "./unions.js";
import { fatal } from "./utils.js";

export interface StarbeamTemplates {
  "package.json": string;
}

export class StarbeamJsx extends Union("react", "preact", "none") {}

export interface StarbeamInfo {
  type: StarbeamType;
  jsx: StarbeamJsx;
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
  tests: AllTests;
  dependencies: Dependencies;
}

export class TestName extends Union("specs", "lint", "types", "prod", "all") {}

export class AllTests {
  static create(tests: Test[]): AllTests {
    return new AllTests(tests);
  }

  #tests: Test[];

  constructor(tests: Test[]) {
    this.#tests = tests;
  }

  get run(): Tests {
    return new Tests(this.#tests.filter((test) => test.type === "run"));
  }

  get watch(): Tests {
    return new Tests(this.#tests.filter((test) => test.type === "watch"));
  }
}

export class Test {
  #type: "watch" | "run";
  #subtype: "workspace" | undefined;
  #name: TestName;
  #script: string;

  constructor(
    type: "watch" | "run",
    subtype: "workspace" | undefined,
    name: TestName,
    script: string
  ) {
    this.#type = type;
    this.#subtype = subtype;
    this.#name = name;
    this.#script = script;
  }

  get name(): TestName {
    return this.#name;
  }

  hasSubtype(subtype: "workspace"): boolean {
    return this.#subtype === subtype;
  }

  get type(): "watch" | "run" {
    return this.#type;
  }

  get script(): string {
    return this.#script;
  }
}

export class Tests {
  #tests: Test[];

  constructor(tests: Test[]) {
    this.#tests = tests;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct(
      "Tests",
      Object.fromEntries([this.#tests].map(([k, v]) => [String(k), v]))
    );
  }

  get #record(): Record<TestName["value"], string> {
    return Object.fromEntries(
      [...this.#tests].map((test) => [String(test.name), test.script])
    ) as Record<TestName["value"], string>;
  }

  get tests(): Record<string, string> {
    return this.#record;
  }

  hasTests(): boolean {
    return isPresentArray(Object.keys(this.#tests));
  }

  filter(filter: (test: Test) => boolean): Tests {
    const filtered = [...this.#tests].filter((test) => filter(test));
    return new Tests(filtered);
  }

  map<T>(map: (test: Test) => T): T[] {
    return this.#tests.map((test) => map(test));
  }

  matches(type: TestName): Tests {
    if (type.is("all")) {
      return this;
    }

    return new Tests(this.#tests.filter((test) => test.name.eq(type)));
  }
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
