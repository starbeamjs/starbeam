import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import { QueryCommand } from "./support/commands";
import type { JsonValue, Package, StarbeamType } from "./support/packages.js";
import { EditJsonc } from "./support/jsonc.js";
import { log, comment, header } from "./support/log.js";
import type { Workspace } from "./support/workspace.js";
import type { Directory, Path } from "./support/paths.js";

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

    if (updater.type === "library") {
      prev.devDependencies = {
        ...(prev.devDependencies as object),
        "@starbeam-workspace/build-support": "workspace:^",
      };
    }

    return prev;
  });
}

function updateTsconfig(workspace: Workspace, updater: UpdatePackage): void {
  const relativeParent = updater.relative(updater.pkg.root.parent);

  const editor = updater.jsonEditor("tsconfig.json");

  editor.remove("compilerOptions.emitDeclarationOnly");

  editor.addUnique(
    "compilerOptions.types",
    updater.relative(workspace.paths.packages.file("env")),
    (type) => typeof type === "string" && type.endsWith("/env")
  );

  if (updater.type === "demo:react") {
    const path = updater.relative(
      workspace.paths.packages.x.dir("devtool").file("tsconfig.json")
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
        workspace.root.file(`.config/tsconfig/${updater.tsconfig}`)
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
        workspace.root.file(".config/tsconfig/tsconfig.-package.json")
      ),
      { position: 0 }
    );
  } else if (updater.isInside("demos")) {
    editor.set(
      "extends",
      updater.relative(
        workspace.root.file(`.config/tsconfig/tsconfig.-demo.json`)
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
    updater.relative(workspace.root.dir(`dist/packages`))
  );
  editor.set("compilerOptions.declaration", true);
  editor.set(
    "compilerOptions.declarationDir",
    updater.relative(workspace.root.dir(`dist/types`))
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
    return this.#workspace.root
      .file(`scripts/templates/package/${name}.template`)
      .readSync();
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

  get pkg(): Package {
    return this.#pkg;
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

    const path = this.root.file(relativePath);
    const prev = existsSync(path) ? readFileSync(path, "utf-8") : undefined;
    const next = updateFn(prev);
    if (prev !== next) {
      this.change(prev === undefined ? "create" : "update", relativePath);
      writeFileSync(path, next);
    }
  }

  get root() {
    return this.#pkg.root;
  }

  relative(path: Path): string {
    return this.root.join(path.absolute).relative;
  }

  jsonEditor(relativePath: string): EditJsonc {
    return EditJsonc.parse(this.root.file(relativePath));
  }

  error(callback: (root: Directory) => void): void {
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
