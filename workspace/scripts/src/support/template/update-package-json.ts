import {
  getFirst,
  isPresentArray,
  type JsonObject,
} from "@starbeam/core-utils";
import type { Package, StarbeamType } from "@starbeam-workspace/package";
import {
  Fragment,
  fragment,
  type ReportableError,
} from "@starbeam-workspace/reporter";
import { Result, type TakeFn } from "@starbeam-workspace/shared";
import { consolidate } from "@starbeam-workspace/utils";
import type { RegularFile } from "trailway";
import type { JsonValue } from "typed-json-utils";

import type { LabelledUpdater } from "../updating/update-file.js";

// @todo get these from package.json (or another single source of truth)
const CURRENT_DEPS = {
  "@vitest/ui": "^0.34.4",
} as const;

export function updatePackageJSON(updater: LabelledUpdater): void {
  const { pkg } = updater;

  updater
    .template(".npmrc")
    .json.template("package.json", ({ current = {}, template }) => {
      return Result.do((take) => {
        return take(ManifestBuilder.create({ ...current, ...template }, pkg))
          .do(
            IfLet(getMain, (main) =>
              insert({ "exports:default": `./${main.relative}` }),
            ),
            If(
              Not(nameIs("@starbeam-dev/eslint-plugin")),
              addDevDep("@starbeam-dev/eslint-plugin"),
            ),
            If(needsBuildSupport, addDevDep("@starbeam-dev/compile")),
          )
          .if(categoryIs("demo"), addDevDep("@vitest/ui"))
          .if(typeIs("demo:react"), insert({ "starbeam:source": "tsx" }))
          .if(
            typeIs("tests"),
            insert.defaults({ "starbeam:source": "tsx" }),
            If(
              (pkg) => pkg.sources.has("d.ts"),
              insert({
                "publishConfig:types": "dist/index.d.ts",
                "publishConfig:exports:.:types": "./dist/index.d.ts",
              }),
              insert({
                "publishConfig:main": "dist/index.cjs",
                "publishConfig:types": "dist/index.d.ts",
                "publishConfig:exports:.": {
                  types: "./dist/index.d.ts",
                  import: "./dist/index.js",
                  default: "./dist/index.cjs",
                },
              }),
            ),
          )
          .if(typeIs("library:interfaces"), (m) => {
            switch (m.main) {
              case "index.ts":
                return m
                  .insert({ types: "index.ts" })
                  .insertDefaults({ "starbeam:source": "ts" });
              case "index.d.ts":
                return m
                  .insert({
                    types: "index.d.ts",
                    "publishConfig:exports": { default: "./index.d.ts" },
                  })
                  .insertDefaults({
                    "starbeam:source": "d.ts",
                  });
              default:
                return m.report(
                  fragment`Since the package type is library:interfaces, main must either be ${Fragment.header.inverse(
                    "index.ts",
                  )} or ${Fragment.header.inverse("index.d.ts")}`,
                );
            }
          })
          .ifLet(
            (pkg) => (pkg.type.is("tests") ? pkg.starbeam.jsx : undefined),
            (jsx) => insert({ "starbeam:source": jsx ? "tsx" : "ts" }),
          )
          .if(
            typeIs("library:upstream-types"),
            insert({ types: "index.d.ts", "starbeam:source": "d.ts" }),
          )
          .if(typeIs("library:public"), insert({ types: "index.ts" }))
          .if(
            hasFile("tsconfig.json"),
            If(
              categoryIs("demo"),
              scripts({ "test:types": "tsc --noEmit -p tsconfig.json" }),
              scripts({ "test:types": "tsc -b" }),
            ),
          )
          .if(hasDir("tests"), { scripts: { "test:specs": "vitest --run" } })
          .scripts({ "test:lint": "eslint . --max-warnings 0" })
          .done();
      });
    });
}

type Test = (pkg: Package) => boolean;
type ExtractFromPackage<T> = (pkg: Package) => T | undefined;
type Action = (manifest: ManifestBuilder) => ManifestBuilder;

const getMain: ExtractFromPackage<RegularFile> = (pkg: Package) =>
  pkg.root ? undefined : pkg.main;

const Not =
  (test: Test): Test =>
  (pkg) =>
    !test(pkg);

const nameIs =
  (name: string): Test =>
  (pkg) =>
    pkg.name === name;
const typeIs =
  (type: StarbeamType["value"]): Test =>
  (pkg) =>
    pkg.type.is(type);
const categoryIs =
  (category: StarbeamType["category"]): Test =>
  (pkg) =>
    pkg.type.hasCategory(category);
const hasFile =
  (file: string): Test =>
  (pkg) =>
    pkg.file(file).exists();
const hasDir =
  (dir: string): Test =>
  (pkg) =>
    pkg.dir(dir).exists();

const addDevDep =
  (name: string): Action =>
  (manifest: ManifestBuilder) =>
    manifest.addDevDep(name);

/**
 * Insert entries into the manifest. If the entries already exist, update them.
 *
 * If the entry is specified using a colon-separated path as its key, it is
 * normalized to a nested JSON path when inserted.
 *
 * For example, `addNested({ "starbeam:source": "ts" })` will add (or merge `{
 * "starbeam": { "source": "ts" } }`) to the manifest.
 *
 * If you *need* to add a literal colon-separated path, use `addExact` instead.
 */
const insert =
  (entries: Record<string, JsonValue>): Action =>
  (manifest) =>
    manifest.insert(entries);

/**
 * Initialize the manifest with the given entries. If the entry already exists,
 * leave it alone.
 *
 * The behavior of the specified entries is the same as {@linkcode insert}.
 */
insert.defaults =
  (entries: Record<string, JsonValue>): Action =>
  (manifest) =>
    manifest.insertDefaults(entries);

const scripts =
  (scripts: Record<string, string>): Action =>
  (manifest) =>
    manifest.scripts(scripts);

const If =
  (...args: Parameters<ManifestBuilder["if"]>): Action =>
  (manifest) =>
    manifest.if(...args);

const IfLet =
  <T>(
    extract: ExtractFromPackage<T>,
    then: (value: T) => Action,
    otherwise?: Action,
  ): Action =>
  (manifest) =>
    manifest.ifLet(extract, then, otherwise);

class ManifestBuilder {
  static create(
    current: JsonObject,
    pkg: Package,
  ): Result<ManifestBuilder, ReportableError> {
    return Result.do((take: TakeFn<ReportableError>) => {
      const builder = take(consolidate(current, "starbeam"));
      return new ManifestBuilder(builder, pkg);
    });
  }

  #current: JsonObject;
  #pkg: Package;
  #errors: ReportableError[] = [];

  constructor(current: JsonObject, pkg: Package) {
    this.#current = current;
    this.#pkg = pkg;
  }

  get main(): string | undefined {
    const { main, types } = this.#current;

    if (typeof main === "string") return main;

    if (main === undefined) {
      const missingEntries: string[] = ["main"];
      if (this.#pkg.type.isTypes) {
        if (typeof types === "string") return types;
        missingEntries.push("types");
      }

      this.#errors.push(
        fragment`Missing ${missingEntries.join(
          " or ",
        )} entry in package.json (expected string): ${
          this.#pkg.root.relativeFromWorkspace
        }`,
      );
    } else {
      this.#errors.push(
        fragment`Invalid main entry in package.json (expected string): ${
          this.#pkg.root.relativeFromWorkspace
        }`,
      );
    }
  }

  report(error: ReportableError): ManifestBuilder {
    this.#errors.push(error);
    return this;
  }

  ifMain(
    then: (main: string, current: JsonObject) => JsonObject | void,
  ): ManifestBuilder {
    if (this.#pkg.root) return this;

    const { main } = this.#current;

    if (main && typeof main === "string") {
      this.#current = then(main, this.#current) ?? this.#current;
    }

    return this;
  }

  #initializeEntry(key: string, value: JsonValue): ManifestBuilder {
    if (key in this.#current) return this;
    return this.addEntry(key, value);
  }

  addEntry(key: string, value: JsonValue): ManifestBuilder {
    this.#current[key] = value;
    return this;
  }

  insertDefaults(entries: Record<string, JsonValue>): ManifestBuilder {
    for (const [key, value] of Object.entries(entries)) {
      const [parentKey, childKey] = key.split(":");

      if (parentKey && childKey) {
        this.#initializeNested([parentKey, childKey], value);
      } else {
        this.#initializeEntry(key, value);
      }
    }

    return this;
  }

  /**
   * @see {insert}
   */
  insert(entries: Record<string, JsonValue>): ManifestBuilder {
    for (const [key, value] of Object.entries(entries)) {
      const [parentKey, childKey] = key.split(":");

      if (parentKey && childKey) {
        this.addNested([parentKey, childKey], value);
      } else {
        this.addEntry(key, value);
      }
    }

    return this;
  }

  #initializeNested(
    [parentKey, key]: [string, string],
    value: JsonValue,
  ): ManifestBuilder {
    let child = this.#current[parentKey];

    if (!child) {
      child = this.#current[parentKey] = {
        [key]: value,
      };
    } else if (typeof child === "object" && !Array.isArray(child)) {
      if (!child[key]) child[key] = value;
    } else {
      this.#errors.push(
        fragment`Invalid ${JSON.stringify(
          String(key),
        )} in package.json (expected object): ${this.#pkg.name}`,
      );
    }

    return this;
  }

  addNested(
    [parentKey, key]: [string, string],
    value: JsonValue,
  ): ManifestBuilder {
    let child = this.#current[parentKey];

    if (!child) {
      child = this.#current[parentKey] = {
        [key]: value,
      };
    } else if (typeof child === "object" && !Array.isArray(child)) {
      child[key] = value;
    } else {
      this.#errors.push(
        fragment`Invalid ${JSON.stringify(
          String(key),
        )} in package.json (expected object): ${this.#pkg.name}`,
      );
    }

    return this;
  }

  ifLet<T>(
    extract: (pkg: Package) => T | undefined,
    then: (value: T) => (builder: ManifestBuilder) => ManifestBuilder,
    otherwise?: (builder: ManifestBuilder) => ManifestBuilder,
  ): ManifestBuilder {
    const value = extract(this.#pkg);
    if (value) {
      return then(value)(this);
    } else if (otherwise) {
      return otherwise(this);
    }

    return this;
  }

  do(...actions: Action[]): ManifestBuilder {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let builder: ManifestBuilder = this;

    for (const action of actions) {
      builder = action(builder);
    }

    return builder;
  }

  if(
    test: (pkg: Package) => boolean,
    then:
      | { scripts: Record<string, string> }
      | ((builder: ManifestBuilder) => ManifestBuilder | void),
    otherwise?: (builder: ManifestBuilder) => ManifestBuilder | void,
  ): ManifestBuilder {
    function normalize(): {
      then: (m: ManifestBuilder) => ManifestBuilder | void;
      otherwise?:
        | undefined
        | ((m: ManifestBuilder) => ManifestBuilder | void)
        | void;
    } {
      if (typeof then === "function") {
        return {
          then,
          otherwise,
        };
      } else {
        return {
          then: (m) => m.scripts(then.scripts),
          otherwise: (m) => m.deleteScripts(Object.keys(then.scripts)),
        };
      }
    }

    const n = normalize();

    if (test(this.#pkg)) {
      return n.then(this) ?? this;
    } else {
      return n.otherwise ? n.otherwise(this) ?? this : this;
    }
  }

  deleteScript(key: string): ManifestBuilder {
    if (this.#current && "scripts" in this.#current) {
      const scripts = this.#current["scripts"];

      if (scripts) delete scripts[key as keyof typeof scripts];
    }

    return this;
  }

  deleteScripts(scripts: string[]): ManifestBuilder {
    for (const key of scripts) {
      this.deleteScript(key);
    }

    return this;
  }

  scripts(scripts: Record<string, string>): ManifestBuilder {
    for (const [key, value] of Object.entries(scripts)) {
      this.#addScript(key, value);
    }

    return this;
  }

  #addScript(key: string, value: string): ManifestBuilder {
    this.addNested(["scripts", key], value);
    return this;
  }

  addDevDep(dep: string, version = this.#versionFor(dep)): ManifestBuilder {
    if (!version) return this;

    this.addNested(["devDependencies", dep], version);

    return this;
  }

  done(): Result<JsonObject, ReportableError> {
    if (isPresentArray(this.#errors)) {
      return Result.err(getFirst(this.#errors));
    } else {
      return Result.ok(this.#current);
    }
  }

  #versionFor(dep: string): string | undefined {
    if (dep in CURRENT_DEPS) {
      return CURRENT_DEPS[dep as keyof typeof CURRENT_DEPS] as string;
    } else if (dep.startsWith("@")) {
      return "workspace:^";
    } else {
      this.#errors.push(
        fragment`Attempting to add an external dependency without a specified version: ${dep}`,
      );
    }
  }
}

function needsBuildSupport(pkg: Package): boolean {
  const hasBuild = pkg.type.hasCategory("library") || pkg.type.is("root");
  const isBuildSupport = pkg.name === "@starbeam-dev/compile";

  return hasBuild && !isBuildSupport && pkg.starbeam.source.hasTS;
}
