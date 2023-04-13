import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

import { isJSONObject, stringifyJSON } from "@starbeam/core-utils";
import type { JsonObject, JsonValue } from "@starbeam-workspace/json";
import type { Package } from "@starbeam-workspace/package";
import { JsonTemplate, Template } from "@starbeam-workspace/package";
import type { Directory, Path, Paths } from "@starbeam-workspace/paths";
import type { ChangeResult } from "@starbeam-workspace/reporter";
import { Fragment, fragment } from "@starbeam-workspace/reporter";
import type { AsString, Into } from "@starbeam-workspace/shared";
import type { Workspace } from "@starbeam-workspace/workspace";
import sh from "shell-escape-tag";

import { Migrator } from "../json-editor/migration.js";
import { EditJsonc } from "../jsonc.js";
import type { UpdatePackageFn } from "./updates.js";

export interface GetRelativePath {
  fromPackageRoot: () => string;
  fromWorkspaceRoot: () => string;
}

export class UpdatePackage {
  static update(
    updatePackage: UpdatePackage,
    label: string,
    updater: (
      update: LabelledUpdater,
      options: { workspace: Workspace; paths: Paths; root: Directory }
    ) => void
  ): void {
    updater(updatePackage.update(label), {
      workspace: updatePackage.#workspace,
      paths: updatePackage.#workspace.paths,
      root: updatePackage.#workspace.root,
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

  get pkg(): Package {
    return this.#pkg;
  }

  done(): void {
    if (this.#emittedHeader) {
      console.groupEnd();
    }
  }

  template(name: Into<Template>): string {
    return this.#packages.template(name);
  }

  get root(): Directory {
    return this.#pkg.root;
  }

  update(label: string): LabelledUpdater {
    return new UpdateFile(this, this.#workspace, label);
  }
}

class UpdateFile implements LabelledUpdater {
  readonly #label: string;
  readonly #updatePackage: UpdatePackage;
  readonly #workspace: Workspace;
  readonly json: UpdateJsonField;

  constructor(
    updatePackage: UpdatePackage,
    workspace: Workspace,
    label: string
  ) {
    this.#updatePackage = updatePackage;
    this.#workspace = workspace;
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
      reportChange({
        workspace,
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
        JsonTemplate.from(intoTemplate).read(this.#workspace.root, {
          type: pkg.type,
          source: pkg.source,
        }) ?? {};

      return json(relativePath, (current) =>
        update({ current: cloneJSON(current), template })
      );
    };

    this.json = json as UpdateJsonField;
  }

  #json: UpdateJsonFn = (relativePath, update): LabelledUpdater => {
    json({
      label: this.#label,
      relativePath,
      update,
      workspace: this.#workspace,
      root: this.#updatePackage.root,
    });
    return this;
  };

  ensureRemoved(relativeFile: string): LabelledUpdater {
    const path = this.#updatePackage.root.file(relativeFile);

    if (path.exists()) {
      reportChange({
        workspace: this.#workspace,
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

  readonly path = (path: Path | string): GetRelativePath => {
    const pkg = this.pkg;
    const workspace = this.#workspace;

    const absolute =
      typeof path === "string"
        ? workspace.root.join(path).absolute
        : path.absolute;

    return {
      fromPackageRoot: (): string => {
        return relative(pkg.root.absolute, absolute);
      },
      fromWorkspaceRoot: (): string => {
        return relative(workspace.root.absolute, absolute);
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
      reportChange({
        workspace: this.#workspace,
        result: prev === undefined ? "create" : "update",
        description: relativePath,
        label: this.#label,
      });
      writeFileSync(path, next);
    }
  }
}

function json({
  label,
  root,
  relativePath,
  update,
  workspace,
}: {
  root: Directory;
  label: string;
  relativePath: string;
  update: JsonUpdates;
  workspace: Workspace;
}): void {
  const path = root.file(relativePath);
  const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;

  const prevJSON = JSON.parse(prev ?? "{}") as JsonValue | undefined;

  if (!isJSONObject(prevJSON)) {
    throw Error(
      `Expected ${relativePath} to contain a json object, but got ${JSON.stringify(
        prevJSON
      )}`
    );
  }

  const next = updateJsonFn(update)({
    ...cloneJSON(prevJSON),
  });

  const prevString = stringifyJSON(normalizeJSON(prevJSON));
  const nextString = stringifyJSON(normalizeJSON(next));

  if (prevString !== nextString) {
    reportChange({
      workspace,
      result: prev === undefined ? "create" : "update",
      description: relativePath,
      label,
    });

    writeFileSync(path, nextString + "\n");
    workspace.cmd(sh`eslint --cache --fix ${path}`);
  }
}

function reportChange({
  workspace,
  result: kind,
  description,
  label,
}: {
  workspace: Workspace;
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

  workspace.reporter.log(log);
}

function updateJsonFn(updater: JsonUpdates): (json: JsonObject) => JsonObject {
  if (typeof updater === "function") {
    return updater;
  } else {
    return (prev) => ({ ...prev, ...updater });
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
  readonly path: (this: void, path: Path | string) => GetRelativePath;
  readonly pkg: Package;
  readonly json: UpdateJsonField;

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
    keys.map((k) => [k, normalizeJSONValue(json[k] as JsonValue)])
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
