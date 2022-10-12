import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import type { JsonObject, JsonValue, Package } from "../packages.js";
import { EditJsonc } from "../jsonc.js";
import { log, Fragment } from "../log.js";
import type { Workspace } from "../workspace.js";
import type { Directory, Path } from "../paths.js";
import type { PackageUpdater } from "./updates.js";
import type { Into } from "../type-magic.js";
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
      console.group(Fragment.header(this.name));
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

  template(name: Into<TemplateName>): string {
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

  updateJsonFile(relativePath: string, updater: JsonUpdater): void {
    this.updateFile(relativePath, (prev) => {
      const json = JSON.parse(prev || "{}");

      if (typeof json !== "object" || json === null) {
        throw Error(
          `Expected ${relativePath} to contain a json object, but got ${json}`
        );
      }

      const next = this.#updateJsonFn(updater)(json);
      return JSON.stringify(next, null, 2) + "\n";
    });
  }

  #updateJsonFn(updater: JsonUpdater): (prev: JsonObject) => JsonObject {
    if (typeof updater === "function") {
      return updater;
    } else {
      return (prev) => ({ ...prev, ...updater });
    }
  }

  #updateFn(updater: FileUpdater): (prev: string | undefined) => string {
    if (typeof updater === "function") {
      return updater;
    } else if (typeof updater === "string") {
      return () => updater;
    } else {
      return () => this.template(updater.template);
    }
  }

  updateFile(template: TemplateName["value"]): void;
  updateFile(relativePath: string, updater: FileUpdater): void;
  updateFile(relativePath: string, updater?: FileUpdater): void {
    const path = this.root.file(relativePath);
    const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;
    const next = this.#updateFn(
      updater ?? { template: relativePath as TemplateName["value"] }
    )(prev);
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
  readonly #updates: Update[] = [];

  constructor(workspace: Workspace, packages: Package[]) {
    this.#workspace = workspace;
    this.#packages = packages;
  }

  pkg(pkg: Package): UpdatePackage {
    return new UpdatePackage(pkg, this, this.#workspace);
  }

  template(name: Into<TemplateName>): string {
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
        .group(pkg.name)
        .empty((r) => {
          if (r.isVerbose) {
            r.endWith({
              compact: {
                fragment: `${Fragment("header:sub", updater.name)}${Fragment(
                  "comment",
                  ": no changes"
                )}`,
                replace: true,
              },
            });
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

export type JsonUpdater =
  | Record<string, JsonValue>
  | ((json: JsonObject) => JsonObject);

export type FileUpdater =
  | string
  | ((prev: string | undefined) => string)
  | { template: TemplateName["value"] };

interface Update {
  condition: (pkg: Package) => boolean;
  use: PackageUpdater;
}
