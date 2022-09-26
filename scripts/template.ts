import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { QueryCommand } from "./support/commands";
import type { JsonValue, Package, StarbeamType } from "./support/packages.js";
import { EditJsonc } from "./support/jsonc.js";
import { log, comment, header } from "./support/log.js";
import type { Workspace } from "./support/workspace.js";

export const TemplateCommand = QueryCommand("template", {
  description: "template a package",
  notes:
    "Packages are only included if they include a `main` field in their package.json",
}).action(({ packages, workspace, verbose }) => {
  const updateAll = new UpdatePackages(workspace, verbose);
  for (const pkg of packages) {
    const updater = updateAll.pkg(pkg);

    updatePackageJSON(updater);
    if (pkg.isSupport("tests")) {
      updateTest(workspace, updater);
    }

    if (pkg.isTypescript) {
      updateTsconfig(workspace, updater);
    }

    if (pkg.type === "library") {
      updateLibrary(workspace, updater);
    }

    updater.done();
  }
});

function updatePackageJSON(updater: UpdatePackage): void {
  let templateFile: TemplateName;

  if (updater.type === "interfaces") {
    templateFile = "interfaces.package.json";
  } else {
    templateFile = "package.json";
  }

  const template = updater.template(templateFile);
  const splice = JSON.parse(template);

  updater.updateJSON("package.json", (prev) => {
    Object.assign(prev, splice);

    if (prev.main) {
      prev.exports = {
        default: `./${prev.main}`,
      };
    }

    return prev;
  });
}

function updateTsconfig(workspace: Workspace, updater: UpdatePackage): void {
  const parent = updater.resolve("..");
  const relativeParent = updater.relative(parent);

  const editor = updater.jsonEditor("tsconfig.json");

  editor.remove("compilerOptions.emitDeclarationOnly");

  editor.addUnique(
    "compilerOptions.types",
    updater.relative(workspace.resolve("packages", "env")),
    (type) => typeof type === "string" && type.endsWith("/env")
  );

  if (updater.type === "demo:react") {
    const path = updater.relative(
      workspace.resolve("packages", "x-devtool", "tsconfig.json")
    );

    editor.addUnique(
      "references",
      {
        path,
      },
      (reference) => isObject(reference) && reference.path === path
    );
  }

  if (updater.tsconfig) {
    editor.set(
      "extends",
      updater.relative(
        workspace.resolve(".config", "tsconfig", updater.tsconfig)
      ),
      { position: 0 }
    );
  } else if (
    updater.isInside("packages") ||
    updater.isInside("framework/react")
  ) {
    editor.set(
      "extends",
      updater.relative(
        workspace.resolve(".config", "tsconfig", "tsconfig.-package.json")
      ),
      { position: 0 }
    );
  } else if (updater.isInside("demos")) {
    editor.set(
      "extends",
      updater.relative(
        workspace.resolve(".config", "tsconfig", "tsconfig.-demo.json")
      ),
      { position: 0 }
    );
  } else {
    updater.error((root) =>
      console.error(
        chalk.red(
          `${root} is inside of an unknown directory: ${relativeParent}`
        )
      )
    );
    process.exit(1);
  }

  editor.set("compilerOptions.composite", true);
  editor.set(
    "compilerOptions.outDir",
    updater.relative(workspace.resolve("dist", "packages"))
  );
  editor.set("compilerOptions.declaration", true);
  editor.set(
    "compilerOptions.declarationDir",
    updater.relative(workspace.resolve("dist", "types"))
  );

  editor.set("compilerOptions.declarationMap", true);

  const changed = editor.write();

  if (changed) {
    updater.change(changed, "tsconfig.json");
  }
}

type TemplateName =
  | "npmrc"
  | "interfaces.package.json"
  | "package.json"
  | "tsconfig.json"
  | "rollup.config.mjs";

class Templates {
  readonly #workspace: Workspace;

  constructor(workspace: Workspace) {
    this.#workspace = workspace;
  }

  get(name: TemplateName): string {
    return readFileSync(
      this.#workspace.resolve(
        "scripts",
        "templates",
        "package",
        `${name}.template`
      ),
      "utf8"
    );
  }
}

class UpdatePackages {
  readonly #workspace: Workspace;
  readonly #templates: Templates;
  readonly #verbose: boolean;

  constructor(workspace: Workspace, verbose: boolean) {
    this.#workspace = workspace;
    this.#templates = new Templates(workspace);
    this.#verbose = verbose;
  }

  verbose(log: () => void) {
    if (this.#verbose) {
      log();
    }
  }

  pkg(pkg: Package) {
    return new UpdatePackage(pkg, this, this.#workspace);
  }

  template(name: TemplateName): string {
    return this.#templates.get(name);
  }
}

class UpdatePackage {
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

  done(): void {
    if (this.#emittedHeader) {
      console.groupEnd();
    } else {
      this.#packages.verbose(() =>
        log(`${header.dim(this.name)}${comment(": no changes")}`)
      );
    }
  }

  change(kind: "create" | "remove" | "update", description: string) {
    if (!this.#emittedHeader) {
      this.#emittedHeader = true;
      console.group(header(this.name));
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

    log(`${flag} ${description}`, comment);
  }

  template(name: TemplateName): string {
    return this.#packages.template(name);
  }

  isInside(relativeToRoot: string): boolean {
    const absoluteDirectory = this.#workspace.resolve(relativeToRoot);
    const relativePath = relative(absoluteDirectory, this.#pkg.root);
    return !!(
      relativePath &&
      !relativePath.startsWith("..") &&
      !isAbsolute(relativePath)
    );
  }

  updateJSON(
    relativePath: string,
    callback: (json: { [key: string]: JsonValue }) => {
      [key: string]: JsonValue;
    }
  ): void {
    this.update(relativePath, (prev) => {
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

  update(
    relativePath: string,
    updater: string | ((prev: string | undefined) => string)
  ): void {
    const updateFn = typeof updater === "function" ? updater : () => updater;

    const path = resolve(this.#pkg.root, relativePath);
    const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;
    const next = updateFn(prev);
    if (prev !== next) {
      this.change(prev === undefined ? "create" : "update", relativePath);
      writeFileSync(path, next);
    }
  }

  resolve(...paths: string[]): string {
    return resolve(this.#pkg.root, ...paths);
  }

  relative(path: string): string {
    return relative(this.#pkg.root, path);
  }

  jsonEditor(relativePath: string): EditJsonc {
    return EditJsonc.parse(this.resolve(relativePath));
  }

  error(callback: (root: string) => void): void {
    callback(this.#pkg.root);
  }
}

function updateTest(workspace: Workspace, updater: UpdatePackage): void {
  const templates = new Templates(workspace);
  const npmrc = templates.get("npmrc");

  updater.update(".npmrc", npmrc);
}

function updateLibrary(workspace: Workspace, updater: UpdatePackage): void {
  const templates = new Templates(workspace);
  const rollup = templates.get("rollup.config.mjs");

  updater.update("rollup.config.mjs", rollup);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
