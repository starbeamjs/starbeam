import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative } from "node:path";

import { isJSONObject, stringifyJSON } from "@starbeam/core-utils";
import sh from "shell-escape-tag";

import type { JsonObject, JsonValue } from "../json";
import { Migrator } from "../json-editor/migration.js";
import { EditJsonc } from "../jsonc.js";
import { Fragment, fragment } from "../log.js";
import type { Package } from "../packages.js";
import type { Directory, Path, Paths } from "../paths.js";
import type { ChangeResult } from "../reporter/reporter.js";
import type { AsString, Into } from "../type-magic.js";
import { type StarbeamType, JsonTemplate, Template } from "../unions.js";
import type { Workspace } from "../workspace.js";
import type { UpdatePackageFn } from "./updates.js";

export interface GetRelativePath {
  readonly fromPackageRoot: string;
  readonly fromWorkspaceRoot: string;
}

export class UpdatePackage {
  static update(
    updatePackage: UpdatePackage,
    label: string,
    updater: (
      update: LabelledUpdater,
      options: { workspace: Workspace; paths: Paths }
    ) => void
  ): void {
    updater(updatePackage.update(label), {
      workspace: updatePackage.#workspace,
      paths: updatePackage.#workspace.paths,
    });
  }

  readonly #pkg: Package;
  readonly #packages: UpdatePackages;
  readonly #workspace: Workspace;
  #emittedHeader = false;

  constructor({
    pkg,
    packages,
    workspace,
  }: {
    pkg: Package;
    packages: UpdatePackages;
    workspace: Workspace;
  }) {
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

  hasTests(): boolean {
    return this.#pkg.root.dir("tests").exists();
  }

  done(): void {
    if (this.#emittedHeader) {
      console.groupEnd();
    }
  }

  template(name: Into<Template>): string {
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

  get root(): Directory {
    return this.#pkg.root;
  }

  error(callback: (root: Directory) => void): void {
    callback(this.#pkg.root);
  }

  update(label: string): LabelledUpdater {
    return new UpdatePackage.#UpdateFile(this, label);
  }

  static #UpdateFile = class UpdateFileImpl implements LabelledUpdater {
    readonly #label: string;
    readonly #updatePackage: UpdatePackage;
    readonly json: UpdateJsonField;

    constructor(updatePackage: UpdatePackage, label: string) {
      this.#updatePackage = updatePackage;
      this.#label = label;

      const json: UpdateJsonFn & Partial<UpdateJsonField> = this.#json;

      json.migrate = <T extends object>(
        relativePath: string,
        callback: (migrator: Migrator<T>) => void
      ) => {
        const editor = EditJsonc.parse(
          this.#updatePackage.root.file(relativePath)
        );
        const migrator = Migrator.create<T>(editor);
        callback(migrator);
        this.#reportChange({
          result: migrator.write(),
          label: this.#label,
          description: relativePath,
        });

        return this;
      };

      json.template = (intoTemplate, update = ({ template }) => template) => {
        const relativePath = String(intoTemplate);
        const pkg = this.#updatePackage.pkg;
        const template =
          JsonTemplate.from(intoTemplate).read(
            this.#updatePackage.#workspace.root,
            {
              type: pkg.type,
              source: pkg.source,
            }
          ) ?? {};

        return json(relativePath, (current) =>
          update({ current: cloneJSON(current), template })
        );
      };

      this.json = json as UpdateJsonField;
    }

    #json: UpdateJsonFn = (relativePath, updater): LabelledUpdater => {
      const path = this.#updatePackage.root.file(relativePath);
      const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;

      const prevJSON = JSON.parse(prev ?? "{}") as JsonValue | undefined;

      if (!isJSONObject(prevJSON)) {
        throw Error(
          `Expected ${relativePath} to contain a json object, but got ${JSON.stringify(
            prevJSON
          )}`
        );
      }

      const next = this.#updateJsonFn(updater)({
        ...cloneJSON(prevJSON),
      });

      const prevString = stringifyJSON(normalizeJSON(prevJSON));
      const nextString = stringifyJSON(normalizeJSON(next));

      if (prevString !== nextString) {
        this.#reportChange({
          result: prev === undefined ? "create" : "update",
          description: relativePath,
          label: this.#label,
        });

        writeFileSync(path, nextString + "\n");
        this.#updatePackage.#workspace.cmd(sh`eslint --cache --fix ${path}`);
      }

      return this;
    };

    file(relativeFile: string, updater: FileUpdater): LabelledUpdater {
      this.#update(relativeFile, this.#updateFn(updater));

      return this;
    }

    ensureRemoved(relativeFile: string): LabelledUpdater {
      const path = this.#updatePackage.root.file(relativeFile);

      if (path.exists()) {
        this.#reportChange({
          result: "remove",
          description: relativeFile,
          label: this.#label,
        });
        path.rmSync();
      }

      return this;
    }

    template(
      intoTemplate: Into<Template>,
      update: (options: {
        current?: string | undefined;
        template: string;
      }) => string = ({ template }) => template
    ): LabelledUpdater {
      const templateName = Template.asString(intoTemplate);

      this.#update(templateName, (current) =>
        update({
          current,
          template: this.#updatePackage.template(templateName),
        })
      );

      return this;
    }

    get pkg(): Package {
      return this.#updatePackage.pkg;
    }

    path = (path: Path | string): GetRelativePath => {
      const pkg = this.pkg;
      const workspace = this.#updatePackage.#workspace;

      return {
        get fromPackageRoot(): string {
          return relative(
            pkg.root.absolute,
            typeof path === "string"
              ? pkg.root.join(path).absolute
              : path.absolute
          );
        },
        get fromWorkspaceRoot(): string {
          return relative(
            workspace.root.absolute,
            typeof path === "string"
              ? pkg.root.join(path).absolute
              : path.absolute
          );
        },
      };
    };

    #updateJsonFn(updater: JsonUpdates): (prev: JsonObject) => JsonObject {
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
        return () => this.#updatePackage.template(updater.template);
      }
    }

    #update(
      relativePath: string,
      updater: (prev: string | undefined) => string
    ): void {
      const path = this.#updatePackage.root.file(relativePath);
      const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;
      const next = updater(prev);
      if (prev !== next) {
        this.#reportChange({
          result: prev === undefined ? "create" : "update",
          description: relativePath,
          label: this.#label,
        });
        writeFileSync(path, next);
      }
    }

    #reportChange({
      result: kind,
      description,
      label,
    }: {
      result: ChangeResult;
      description: string;
      label?: string;
    }): void {
      if (kind === false) {
        return;
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

      let log = Fragment.comment(`${flag} ${description}`);
      if (label) {
        log = log.concat(` `).concat(Fragment.comment.dim(label));
      }

      this.#updatePackage.#workspace.reporter.log(log);
    }
  };
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
    return new UpdatePackage({
      pkg,
      packages: this,
      workspace: this.#workspace,
    });
  }

  template(name: Into<Template>): string {
    return Template.from(name).read(this.#workspace.root);
  }

  when: UpdatePackagesFn = (condition, label) => {
    return {
      use: (updater) => {
        this.#updates.push({
          condition,
          updateFn: updater,
          label,
        });
        return this;
      },
    };
  };

  update(prepare: (updatePackages: UpdatePackagesFn) => void): void {
    prepare(this.when);

    for (const pkg of this.#packages) {
      this.#workspace.reporter
        .group(pkg.name)
        .empty((r) => {
          if (r.isVerbose) {
            r.endWith({
              compact: {
                fragment: fragment`${Fragment(
                  "header:sub",
                  pkg.name
                )}${Fragment("comment", ": no changes")}`,
                replace: true,
              },
            });
          }
        })
        .try(() => {
          const updatePackage = this.pkg(pkg);

          for (const { condition, updateFn, label } of this.#updates) {
            if (condition(pkg)) {
              UpdatePackage.update(updatePackage, label, updateFn);
            }
          }

          updatePackage.done();
        });
    }
  }
}

export type JsonUpdates =
  | Record<string, JsonValue>
  | ((json: JsonObject) => JsonObject);

export interface TemplateFileUpdater {
  template: AsString<Template>;
}

export type FileUpdater =
  | string
  | ((prev: string | undefined) => string)
  | TemplateFileUpdater;

export interface Update {
  condition: (pkg: Package) => boolean;
  updateFn: UpdatePackageFn;
  label: string;
}

export type UpdatePackagesFn = (
  condition: (pkg: Package) => boolean,
  label: string
) => {
  use: (updater: UpdatePackageFn) => UpdatePackages;
};

type UpdateJsonFn = (
  this: void,
  relativePath: string,
  updater: JsonUpdates
) => LabelledUpdater;

interface UpdateJsonField extends UpdateJsonFn {
  migrator: <T extends object>(
    relativePath: string,
    callback: (migrator: Migrator<T>) => void
  ) => LabelledUpdater;
  migrate: <T extends object>(
    relativePath: string,
    callback: (migrator: Migrator<T>) => void
  ) => void;
  template: (
    template: Into<JsonTemplate>,
    update?:
      | ((options: {
          current?: JsonObject | undefined;
          template: JsonObject;
        }) => JsonObject)
      | undefined
  ) => LabelledUpdater;
}

export interface LabelledUpdater {
  path: (
    this: void,
    path: Path | string
  ) => {
    readonly fromPackageRoot: string;
    readonly fromWorkspaceRoot: string;
  };

  readonly pkg: Package;

  readonly json: UpdateJsonField;

  file: (relativeFile: string, updater: FileUpdater) => LabelledUpdater;

  ensureRemoved: (relativeFile: string) => LabelledUpdater;

  template: (
    template: Into<Template>,
    update?:
      | ((options: {
          current?: string | undefined;
          template: string;
        }) => string)
      | undefined
  ) => LabelledUpdater;
}

function normalizeJSON(json: JsonObject): JsonObject {
  const keys = Object.keys(json).sort();
  return Object.fromEntries(
    keys.map((k) => [k, normalizeJSONValue(json[k] as JsonObject)])
  );
}

function normalizeJSONValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(normalizeJSONValue);
  } else if (typeof value === "object" && value !== null) {
    return normalizeJSON(value);
  } else {
    return value;
  }
}

function cloneJSON<T extends JsonValue>(value: T): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(JSON.stringify(value));
}
