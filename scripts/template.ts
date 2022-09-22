import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { QueryCommand } from "./support/commands";
import type { JsonValue, Package, StarbeamType } from "./support/packages.js";
import { EditJsonc } from "./support/jsonc.js";
import { log, comment, header } from "./support/log.js";

export const TemplateCommand = QueryCommand("template", {
  description: "template a package",
  notes:
    "Packages are only included if they include a `main` field in their package.json",
}).action(({ packages, root, verbose }) => {
  const updateAll = new UpdatePackages(root, verbose);
  for (const pkg of packages) {
    const updater = updateAll.pkg(pkg);
    log(`=== Updating ${pkg.name} ===`, header);
    updatePackageJSON(updater);
    if (pkg.isTests) {
      updateTest(root, updater);
    } else if (pkg.isTypescript) {
      // intentionally leave out tsconfig in tests
      updateTsconfig(root, updater);
    }
  }
});

function updatePackageJSON(updater: UpdatePackage) {
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

function updateTsconfig(root: string, updater: UpdatePackage) {
  const parent = updater.resolve("..");
  const relativeParent = updater.relative(parent);

  console.log(chalk.gray(`+ tsconfig.json`));

  const editor = updater.jsonEditor("tsconfig.json");

  editor.addUnique(
    "compilerOptions.types",
    updater.relative(resolve(root, "packages", "./env")),
    (type) => typeof type === "string" && type.endsWith("/env")
  );

  if (updater.tsconfig) {
    editor.set(
      "extends",
      updater.resolve(resolve(root, ".config", "tsconfig", updater.tsconfig)),
      { position: 0 }
    );
  } else if (
    updater.isInside("packages") ||
    updater.isInside("framework/react")
  ) {
    editor.set(
      "extends",
      updater.relative(
        resolve(root, ".config", "tsconfig", "tsconfig.-package.json")
      ),
      { position: 0 }
    );
  } else if (updater.isInside("demos")) {
    editor.set(
      "extends",
      updater.relative(
        resolve(root, ".config", "tsconfig", "tsconfig.-demo.json")
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
  editor.set("compilerOptions.declaration", true);
  editor.set("compilerOptions.emitDeclarationOnly", true);
  editor.set(
    "compilerOptions.declarationDir",
    updater.relative(resolve(root, "dist", "types", ...updater.name.split("/")))
  );
  editor.set("compilerOptions.declarationMap", true);

  editor.write();
}

type TemplateName =
  | "npmrc"
  | "interfaces.package.json"
  | "package.json"
  | "tsconfig.json";

class Templates {
  readonly #root: string;

  constructor(root: string) {
    this.#root = root;
  }

  get(name: TemplateName): string {
    return readFileSync(
      resolve(this.#root, ".templates", "package", name),
      "utf8"
    );
  }
}

class UpdatePackages {
  readonly #root: string;
  readonly #templates: Templates;
  readonly #verbose: boolean;

  constructor(root: string, verbose: boolean) {
    this.#root = root;
    this.#templates = new Templates(root);
    this.#verbose = verbose;
  }

  verbose(log: () => void) {
    if (this.#verbose) {
      log();
    }
  }

  pkg(pkg: Package) {
    return new UpdatePackage(pkg, this);
  }

  get root(): string {
    return this.#root;
  }

  template(name: TemplateName): string {
    return this.#templates.get(name);
  }
}

class UpdatePackage {
  readonly #pkg: Package;
  readonly #packages: UpdatePackages;

  constructor(pkg: Package, packages: UpdatePackages) {
    this.#pkg = pkg;
    this.#packages = packages;
  }

  get #root(): string {
    return this.#packages.root;
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

  template(name: TemplateName): string {
    return this.#packages.template(name);
  }

  isInside(relativeToRoot: string): boolean {
    const absoluteDirectory = resolve(this.#root, relativeToRoot);
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
  ) {
    this.update(relativePath, (prev) => {
      const json = JSON.parse(prev || "{}");

      if (typeof json !== "object" || json === null) {
        throw Error(
          `Expected ${relativePath} to contain a json object, but got ${json}`
        );
      }

      const next = callback(json);
      return JSON.stringify(next, null, 2);
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
      log(`${prev === undefined ? "+" : "U"} ${relativePath}`, comment);
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

function updateTest(root: string, updater: UpdatePackage): void {
  const templates = new Templates(root);
  const npmrc = templates.get("npmrc");

  updater.update(".npmrc", npmrc);
}
