import { isObject, stringify } from "@starbeam/core-utils";
import type { JsonValue } from "@starbeam-workspace/json";
import type { RegularFile } from "@starbeam-workspace/paths";
import type { Directory } from "@starbeam-workspace/paths";
import type { Workspace } from "@starbeam-workspace/reporter";

import type { Dependencies } from "./dependencies.js";
import { createDependencies } from "./dependencies.js";
import type { PackageInfo, Used } from "./packages";
import { RawPackage } from "./raw-package";
import { Starbeam } from "./starbeam";
import { TypeScriptConfig } from "./typescript.js";
import { StarbeamSources, StarbeamType } from "./unions.js";

export class Package {
  static from(this: void, workspace: Workspace, manifest: RegularFile): Package;
  static from(
    this: void,
    workspace: Workspace,
    manifest: RegularFile,
    options: { allow: "missing" }
  ): Package | undefined;
  static from(
    this: void,
    workspace: Workspace,
    manifest: RegularFile,
    options?: { allow: "missing" }
  ): Package | undefined {
    const pkg = manifest.readSync<Record<string, JsonValue>>({ as: "json" });

    if (!isObject(pkg)) {
      if (options?.allow === "missing") {
        return undefined;
      } else {
        throw Error(stringify`Invalid package.json at ${manifest}`);
      }
    }

    const root = manifest.parent;
    const raw = new RawPackage(pkg, root.absolute);

    const main = raw.get("main", { default: undefined as undefined | string });

    const scripts: Record<string, string> = raw.get("scripts", {
      default: {},
    });

    const tests: Record<string, string> = {};

    for (const [name, script] of Object.entries(scripts)) {
      if (name.startsWith("test:")) {
        tests[name.slice("test:".length)] = script;
      }
    }

    const type = StarbeamType.from(
      raw.get("starbeam:type", {
        default: main ? "none" : "unknown",
      })
    );

    const source = StarbeamSources.from(
      raw.get("starbeam:source", {
        default: "ts",
      })
    );

    return new Package(workspace, {
      manifest,
      name: raw.get("name"),
      type: raw.get("type", { default: "commonjs" }),
      main,
      root: root.absolute,
      isPrivate: raw.get("private", { default: false }),
      isTypescript: root.file("tsconfig.json").exists(),
      scripts,
      tests,
      dependencies: createDependencies(raw),
      starbeam: {
        tsconfig: raw.get<string | undefined>("starbeam:tsconfig", {
          default: undefined,
        }),
        type,
        source,
        used: raw.get("starbeam:used", { default: [] }),
        templates: {
          "package.json": raw.get("starbeam:template:package", {
            default: "package.json",
          }),
        },
      },
    });
  }

  readonly #workspace: Workspace;

  constructor(workspace: Workspace, readonly info: PackageInfo) {
    this.#workspace = workspace;
  }

  get workspace(): Workspace {
    return this.#workspace;
  }

  get name(): string {
    return this.info.name;
  }

  get root(): Directory {
    return this.info.manifest.parent;
  }

  file(path: string): RegularFile {
    return this.root.file(path);
  }

  dir(path: string): Directory {
    return this.root.dir(path);
  }

  get moduleType(): "esm" | "cjs" {
    return this.info.type === "module" ? "esm" : "cjs";
  }

  get source(): StarbeamSources {
    return this.info.starbeam.source;
  }

  get starbeam(): Starbeam {
    return new Starbeam(this.info.starbeam);
  }

  get isPrivate(): boolean {
    return this.info.isPrivate;
  }

  get isTypescript(): boolean {
    return this.info.isTypescript;
  }

  get tsconfig(): string | undefined {
    return this.info.starbeam.tsconfig;
  }

  get type(): StarbeamType {
    return this.info.starbeam.type;
  }

  get used(): Used[] {
    return this.info.starbeam.used;
  }

  get testsDirectory(): Directory {
    return this.root.dir("tests");
  }

  get tests(): Record<string, string> {
    return this.info.tests;
  }

  get dependencies(): Dependencies {
    return this.info.dependencies;
  }

  tsconfigJSON(): TypeScriptConfig | undefined {
    const tsconfigFile = this.tsconfig
      ? this.#workspace.root.file(this.tsconfig)
      : this.file("tsconfig.json");

    if (tsconfigFile.exists()) {
      return new TypeScriptConfig(tsconfigFile.readSync({ as: "json" }));
    }
  }

  isInput(kind: "d.ts" | "js"): boolean {
    return this.starbeam.isInput(kind);
  }
}
