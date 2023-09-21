import {
  getFirst,
  isEmptyMatch,
  isObject,
  isSingleItemArray,
  Pattern,
  stringify,
} from "@starbeam/core-utils";
import type { JsonValue } from "@starbeam-workspace/json";
import type {
  type Directory,
  type Glob,
  RegularFile,
} from "@starbeam-workspace/paths";
import { Globs } from "@starbeam-workspace/paths";
import { fragment, type Workspace } from "@starbeam-workspace/reporter";

import type { Dependencies } from "./dependencies.js";
import { createDependencies } from "./dependencies.js";
import { StarbeamJsx, Test, TestName } from "./packages";
import { AllTests, type PackageInfo, type Used } from "./packages";
import { RawPackage } from "./raw-package";
import { Starbeam } from "./starbeam";
import { TypeScriptConfig } from "./typescript.js";
import { StarbeamSource, StarbeamSources, StarbeamType } from "./unions.js";

export class Package {
  static from(this: void, workspace: Workspace, manifest: RegularFile): Package;
  static from(
    this: void,
    workspace: Workspace,
    manifest: RegularFile,
    options: { allow: "missing" },
  ): Package | undefined;
  static from(
    this: void,
    workspace: Workspace,
    manifest: RegularFile,
    options?: { allow: "missing" },
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

    const packageName: string = raw.get("name");
    const main = raw.get("main", {
      default: undefined as undefined | string,
    });

    const scripts: Record<string, string> = raw.get("scripts", {
      default: {},
    });

    const tests: Test[] = [];

    for (const [name, script] of Object.entries(scripts)) {
      if (name.startsWith("test:")) {
        const { testName, type, subtype } = normalizeTestName(
          workspace,
          { root, name: raw.get("name") },
          name,
        );

        tests.push(new Test(type, subtype, TestName.parse(testName), script));
      }
    }

    const type = StarbeamType.parse(
      raw.get("starbeam:type", {
        default: main ? "none" : "unknown",
      }),
    );

    const source = StarbeamSources.of(
      raw
        .getArray("starbeam:source", {
          default: "ts",
        })
        .map((source) => StarbeamSource.parse(source)),
    );

    const jsx = StarbeamJsx.parse(
      raw.get("starbeam:jsx", {
        default: source.has("jsx", "tsx") ? "react" : "none",
      }),
    );

    return new Package(workspace, {
      manifest,
      name: packageName,
      type: raw.get("type", { default: "commonjs" }),
      main,
      root: root.absolute,
      isPrivate: raw.get("private", { default: false }),
      isTypescript: root.file("tsconfig.json").exists(),
      scripts,
      tests: AllTests.create(tests),
      dependencies: createDependencies(raw),
      starbeam: {
        type,
        jsx,
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

  constructor(
    workspace: Workspace,
    readonly info: PackageInfo,
  ) {
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

  get sourceFiles(): Globs<RegularFile> {
    let globs = Globs.root(this.root, { match: ["files"] });

    for (const source of this.sources) {
      if (source.hasFiles()) {
        const exts = source.inputExtensions;

        if (source.isType("bin")) {
          globs = globs.add(`bin/**/*.${exts.glob}`);
        } else if (this.type.isType("library", "demo")) {
          globs = globs.add(`index.${exts.glob}`);
          globs = globs.add(`src/**/*.${exts.glob}`);
        } else {
          globs = globs.add(`**/*.${exts.glob}`);
        }
      }
    }

    return globs;
  }

  file(path: string): RegularFile {
    return this.root.file(path);
  }

  dir(path: string): Directory {
    return this.root.dir(path);
  }

  get inputGlobs(): Glob<RegularFile>[] {
    const exts = this.sources.inputExtensions as string[];

    const ext = isSingleItemArray(exts)
      ? getFirst(exts)
      : `{${exts.join(",")}}`;

    const paths: Glob<RegularFile>[] = [];

    if (this.root.file(`index.${ext}`).exists()) {
      paths.push(this.root.glob(`index.${ext}`, { match: ["files"] }));
    }

    if (this.root.dir("src").exists()) {
      paths.push(this.root.glob(`src/**/*.${ext}`, { match: ["files"] }));
    }

    return paths;
  }

  get moduleType(): "esm" | "cjs" {
    return this.info.type === "module" ? "esm" : "cjs";
  }

  get sources(): StarbeamSources {
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

  get type(): StarbeamType {
    return this.info.starbeam.type;
  }

  get used(): Used[] {
    return this.info.starbeam.used;
  }

  get testsDirectory(): Directory {
    return this.root.dir("tests");
  }

  get tests(): AllTests {
    return this.info.tests;
  }

  get dependencies(): Dependencies {
    return this.info.dependencies;
  }

  tsconfigFile(): RegularFile | undefined {
    if (this.sources.hasTS) {
      return this.file("tsconfig.json");
    }
  }

  tsconfigJSON(): TypeScriptConfig | undefined {
    const tsconfigFile = this.tsconfigFile();

    if (tsconfigFile?.exists()) {
      return new TypeScriptConfig(tsconfigFile.readSync({ as: "json" }));
    }
  }

  isInput(kind: "d.ts" | "js"): boolean {
    return this.starbeam.isInput(kind);
  }
}

function normalizeTestName(
  workspace: Workspace,
  pkg: { root: Directory; name: string },
  name: string,
): {
  type: "run" | "watch";
  subtype: "workspace" | undefined;
  testName: string;
} {
  const pattern = Pattern<{
    subtype: "workspace" | undefined;
    type: "run" | "watch" | undefined;
    name: string;
  }>(
    /^test:(?:(?<subtype>workspace):)?(?:(?<type>run|watch)?:)?(?<name>[^:]+)$/,
  );

  const match = pattern.match(name);

  if (isEmptyMatch(match)) {
    workspace.reporter.fatal(
      fragment`Invalid test name ${name} in ${pkg.name} (${pkg.root.relative})`,
    );
  }

  return {
    type: match.type ?? "run",
    subtype: match.subtype,
    testName: match.name,
  };
}
