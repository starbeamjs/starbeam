import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

import { isJSONObject, stringifyJSON } from "@starbeam/core-utils";
import { SourceRoot } from "@starbeam-workspace/edit-json";
import type { JsonObject, JsonValue } from "@starbeam-workspace/json";
import type { Package } from "@starbeam-workspace/package";
import { JsonTemplate, Template } from "@starbeam-workspace/package";
import type { Directory, Path, Paths } from "@starbeam-workspace/paths";
import type { ReportableError } from "@starbeam-workspace/reporter";
import { Fragment, fragment } from "@starbeam-workspace/reporter";
import {
  type AsString,
  type ChangeResult,
  type Into,
  type IntoResult,
  Result,
} from "@starbeam-workspace/shared";
import type { Workspace } from "@starbeam-workspace/workspace";
import sh from "shell-escape-tag";

import { Migrator } from "../jsonc/migration.js";
import type { UpdatePackageFn } from "../template/updates.js";

export interface GetRelativePath {
  fromPackageRoot: () => string;
  fromWorkspaceRoot: () => string;
}

export class UpdatePackage {
  static async update(
    updatePackage: UpdatePackage,
    label: string,
    updater: (
      update: LabelledUpdater,
      options: { workspace: Workspace; paths: Paths; root: Directory },
    ) => void | Promise<void>,
  ): Promise<void> {
    await updater(updatePackage.update(label), {
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
      // eslint-disable-next-line no-console -- @fixme
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
    label: string,
  ) {
    this.#updatePackage = updatePackage;
    this.#workspace = workspace;
    this.#label = label;

    const json: UpdateJsonFn & Partial<UpdateJsonField> = this.#json;

    json.migrate = async <T extends object>(
      relativePath: string,
      callback: (migrator: Migrator<T>) => void,
    ): Promise<void> => {
      const file = this.#updatePackage.root.file(relativePath);

      const root = SourceRoot.parse(relativePath, await file.read());
      const migrator = Migrator.create<T>(root);
      callback(migrator);
      reportChange({
        workspace,
        result: await migrator.write(async (source) => file.write(source)),
        label: this.#label,
        description: relativePath,
      });
    };

    json.template = (intoTemplate, update = ({ template }) => template) => {
      const relativePath = String(intoTemplate);
      const pkg = this.#updatePackage.pkg;
      const template =
        JsonTemplate.from(intoTemplate).read(this.#workspace.root, {
          type: pkg.type,
          source: pkg.sources,
        }) ?? {};

      return json(relativePath, (current) =>
        update({ current: cloneJSON(current), template }),
      );
    };

    this.json = json as UpdateJsonField;
  }

  #json: UpdateJsonFn = (relativePath, update): LabelledUpdater => {
    // @todo handle fail fast by unwinding back to the most recent isolated
    // group after reporting the error.
    this.#workspace.reporter.getOkValue(
      json({
        label: this.#label,
        relativePath,
        update,
        workspace: this.#workspace,
        root: this.#updatePackage.root,
      }),
    );
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
    }) => string = ({ template }) => template,
  ): LabelledUpdater {
    const templateName = Template.asString(intoTemplate);

    this.#update(templateName, (current) =>
      update({
        current,
        template: this.#updatePackage.template(templateName),
      }),
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

  #update(
    relativePath: string,
    updater: (prev: string | undefined) => string,
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
}): Result<void, ReportableError> | void {
  const path = root.file(relativePath);
  const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;

  return Result.do((take) => {
    const prevJSON = take(JSON.parse(prev ?? "{}") as JsonValue | undefined);

    if (!isJSONObject(prevJSON)) {
      return take.err(
        fragment`Expected ${relativePath} to contain a json object, but got ${JSON.stringify(
          prevJSON,
        )}` as ReportableError,
      );
    }

    const next = take(
      updateJsonFn(update)({
        ...cloneJSON(prevJSON),
      }),
    );

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
      workspace.cmd(sh`prettier --print-width 100 -w ${path}`);
    }
  });
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

function updateJsonFn(updater: JsonUpdates): JsonUpdateFn {
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
      use: (...updaters) => {
        for (const updater of updaters) {
          this.#updates.push({
            condition,
            updateFn: updater,
            label,
          });
        }

        return this;
      },
    };
  };

  async update(prepare: (when: UpdatePackagesFn) => void): Promise<void> {
    prepare(this.when);

    for (const pkg of this.#packages) {
      await this.#workspace.reporter
        .group(pkg.name)
        .empty((r) => {
          if (r.isVerbose) {
            r.endWith({
              compact: {
                fragment: fragment`${Fragment(
                  "header:sub",
                  pkg.name,
                )}${Fragment("comment", ": no changes")}`,
                replace: true,
              },
            });
          }
        })
        .tryAsync(async () => {
          const updatePackage = this.pkg(pkg);

          for (const { condition, updateFn, label } of this.#updates) {
            if (condition(pkg)) {
              await UpdatePackage.update(updatePackage, label, updateFn);
            }
          }

          updatePackage.done();
        });
    }
  }
}

type JsonUpdateFn = (
  json: JsonObject,
) => IntoResult<JsonObject, ReportableError>;

export type JsonUpdates = Record<string, JsonValue> | JsonUpdateFn;

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
  label: string,
) => {
  use: (...updaters: UpdatePackageFn[]) => UpdatePackages;
};

type UpdateJsonFn = <U extends JsonUpdates>(
  this: void,
  relativePath: string,
  updater: U,
) => LabelledUpdater;

interface UpdateJsonField extends UpdateJsonFn {
  migrate: <T extends object>(
    relativePath: string,
    callback: (migrator: Migrator<T>) => void | Promise<void>,
  ) => Promise<void>;
  template: (
    template: Into<JsonTemplate>,
    update?:
      | ((options: {
          current?: JsonObject | undefined;
          template: JsonObject;
        }) => IntoResult<JsonObject, ReportableError>)
      | undefined,
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
      | undefined,
  ) => LabelledUpdater;
}

function normalizeJSON(json: JsonObject): JsonObject {
  const keys = Object.keys(json).sort();
  return Object.fromEntries(
    keys.map((k) => [k, normalizeJSONValue(json[k] as JsonValue)]),
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
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-return 
     -- the whole point of this function is to return a clone
     of an arbitrary JSON value by passing it through JSON.stringify
     and JSON.parse. In the general case, this is an unsafe operation,
     but since we know that the input is a JSON object, we can
     safely assume that the output is a type-equivalent JSON object.
  */
  return JSON.parse(JSON.stringify(value));
}
