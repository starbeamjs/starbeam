import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import type { JsonValue, Package } from "../packages.js";
import { EditJsonc } from "../jsonc.js";
import { log, Fragment } from "../log.js";
import type { Workspace } from "../workspace.js";
import type { Directory, Path } from "../paths.js";
import type { PackageUpdater } from "./updates.js";
import type { IntoUnion } from "../type-magic.js";
import { TemplateName, type StarbeamType } from "../unions.js";

export class UpdatePackage {
  readonly #pkg: Package;
  readonly #packages: UpdatePackages;
  readonly #workspace: Workspace;
  #emittedHeader = false;

  constructor(pkg: Package, packages: UpdatePackages, workspace: Workspace) {
    this.#pkg = pkg;
    this.#packages = packages;
    this.#workspace = workspace;
  }

  get tsconfig(): string | undefined {
    return this.#pkg.tsconfig;
  }

  get name(): string {
    return this.#pkg.name;
  }

  get type(): StarbeamType | undefined {
    return this.#pkg.type;
  }

  get pkg(): Package {
    return this.#pkg;
  }

  hasTsconfig(): boolean {
    return this.#pkg.root.file("tsconfig.json").exists();
  }

  hasTests(): boolean {
    return this.#pkg.root.dir("tests").exists();
  }

  done(): void {
    if (this.#emittedHeader) {
      console.groupEnd();
    } else {
    }
  }

  change(kind: "create" | "remove" | "update", description: string): void {
    if (!this.#emittedHeader) {
      this.#emittedHeader = true;
      console.group(Fragment.header("header", this.name));
    }

    let flag: string;
    switch (kind) {
      case "create":
        flag = "+";
        break;
      case "remove":
        flag = "-";
        break;
      case "update":
        flag = "~";
        break;
    }

    log(`${flag} ${description}`, "comment");
  }

  template(name: IntoUnion<TemplateName>): string {
    return this.#packages.template(name);
  }

  isInside(relativeToRoot: string): boolean {
    const absoluteDirectory = this.#workspace.root.join(relativeToRoot);
    const relativePath = relative(
      absoluteDirectory.absolute,
      this.#pkg.root.absolute
    );
    return !!(
      relativePath &&
      !relativePath.startsWith("..") &&
      !isAbsolute(relativePath)
    );
  }

  updateJsonFile(
    relativePath: string,
    callback: (json: { [key: string]: JsonValue }) => {
      [key: string]: JsonValue;
    }
  ): void {
    this.updateFile(relativePath, (prev) => {
      const json = JSON.parse(prev || "{}");

      if (typeof json !== "object" || json === null) {
        throw Error(
          `Expected ${relativePath} to contain a json object, but got ${json}`
        );
      }

      const next = callback(json);
      return JSON.stringify(next, null, 2) + "\n";
    });
  }

  updateFile(
    relativePath: string,
    updater: string | ((prev: string | undefined) => string)
  ): void {
    const updateFn = typeof updater === "function" ? updater : () => updater;

    const path = this.root.file(relativePath);
    const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;
    const next = updateFn(prev);
    if (prev !== next) {
      this.change(prev === undefined ? "create" : "update", relativePath);
      writeFileSync(path, next);
    }
  }

  get root(): Directory {
    return this.#pkg.root;
  }

  relative(path: Path): string {
    return relative(this.#pkg.root.absolute, path.absolute);
  }

  jsonEditor(relativePath: string): EditJsonc {
    return EditJsonc.parse(this.root.file(relativePath));
  }

  error(callback: (root: Directory) => void): void {
    callback(this.#pkg.root);
  }

  update(updater: PackageUpdater): void {
    return updater(this, {
      workspace: this.#workspace,
      paths: this.#workspace.paths,
    });
  }
}

export class UpdatePackages {
  readonly #workspace: Workspace;
  readonly #packages: Package[];
  readonly #verbose: boolean;
  readonly #updates: Update[] = [];

  constructor(workspace: Workspace, packages: Package[], verbose: boolean) {
    this.#workspace = workspace;
    this.#packages = packages;
    this.#verbose = verbose;
  }

  pkg(pkg: Package): UpdatePackage {
    return new UpdatePackage(pkg, this, this.#workspace);
  }

  template(name: IntoUnion<TemplateName>): string {
    return TemplateName.from(name).read(this.#workspace.root);
  }

  when = (
    condition: (pkg: Package) => boolean,
    { use }: { use: PackageUpdater }
  ): this => {
    this.#updates.push({ condition, use });
    return this;
  };

  update(
    prepare: (
      when: (
        condition: (pkg: Package) => boolean,
        options: { use: PackageUpdater }
      ) => void
    ) => void
  ): void {
    prepare(this.when);

    for (const pkg of this.#packages) {
      const updater = this.pkg(pkg);
      this.#workspace.reporter
        .group()
        .empty((r) => {
          if (r.isVerbose) {
            r.logCompact(
              `${Fragment("header:sub", updater.name)}${Fragment(
                "comment",
                ": no changes"
              )}`
            );
          }
        })
        .try(() => {
          for (const { condition, use } of this.#updates) {
            if (condition(pkg)) {
              updater.update(use);
            }
          }

          updater.done();
        });
    }
  }
}

interface Update {
  condition: (pkg: Package) => boolean;
  use: PackageUpdater;
}
