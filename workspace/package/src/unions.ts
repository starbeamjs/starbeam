import {
  DisplayStruct,
  getFirst,
  isSingleItemArray,
  stringify,
} from "@starbeam/core-utils";
import { type IntoUnionInstance, Union } from "@starbeam-workspace/shared";
import type { Directory, Globs, RegularFile } from "trailway";
import type { JsonObject, JsonValue } from "typed-json-utils";

export class StarbeamType extends Union(
  "library:interfaces",
  "library:upstream-types",
  "library:public",
  "library:tests",
  "library:test-support",
  "library:build-support",
  "demo:react",
  "demo:preact",
  "extracting:library",
  "extracting:tests",
  "draft",
  "none",
  "root",
  "tests",
  "unknown",
) {
  get isTypes(): boolean {
    return this.is("library:interfaces") || this.is("library:upstream-types");
  }

  get isTests(): boolean {
    return this.hasCategory("tests") || this.is("extracting:tests");
  }
}

type Ext = "d.ts" | "js" | "jsx" | "ts" | "tsx";

const EXTS = ["d.ts", "js", "jsx", "ts", "tsx"] as const;

export class DependencyType extends Union(
  "development",
  "optional",
  "peer",
  "runtime",
) {
  static development = DependencyType.of("development");
  static optional = DependencyType.of("optional");
  static peer = DependencyType.of("peer");
  static runtime = DependencyType.of("runtime");
}

export class StarbeamSources implements Iterable<StarbeamSource> {
  static of(sources: Iterable<StarbeamSource>): StarbeamSources {
    return new StarbeamSources([...sources]);
  }

  #sources: StarbeamSource[];

  private constructor(sources: StarbeamSource[]) {
    this.#sources = sources;
  }

  [Symbol.iterator](): Iterator<StarbeamSource> {
    return this.#sources[Symbol.iterator]();
  }

  some(matcher: (source: StarbeamSource) => boolean): boolean {
    return this.#sources.some(matcher);
  }

  /**
   * Determine whether this source type includes the given extension.
   */
  has(...exts: Ext[]): boolean {
    return this.some((source) => source.has(...exts));
  }

  get hasJS(): boolean {
    return this.some((source) => source.isJS);
  }

  get isOnlyJS(): boolean {
    return this.some((source) => source.isJS);
  }

  get hasTS(): boolean {
    return this.some((source) => source.isTS);
  }

  get hasBin(): boolean {
    return this.some((source) => source.hasCategory("bin"));
  }

  get bin(): StarbeamSource | undefined {
    return this.#sources.find((source) => source.hasCategory("bin"));
  }

  hasFiles(): boolean {
    return this.some((source) => source.hasFiles());
  }

  /**
   * The list of extensions that are included in this source type.
   */
  get inputExtensions(): Extensions {
    return Extensions.from(
      this.#sources.map((source) => source.inputExtensions),
    );
  }

  typescript(root: Directory): Globs<RegularFile> {
    return this.select(root, ["ts", "tsx", "d.ts"]);
  }

  javascript(root: Directory): Globs<RegularFile> {
    return this.select(root, ["js"]);
  }

  jsx(root: Directory): Globs<RegularFile> {
    return this.select(root, ["jsx"]);
  }

  select(root: Directory, exts: Ext[]): Globs<RegularFile> {
    let globs = root.globs({ match: ["files"] });

    for (const source of this.#sources) {
      globs = source.select(root, exts, globs);
    }

    return globs;
  }

  exclude(root: Directory, excluded: Ext[]): Globs<RegularFile> {
    const selected = new Set(EXTS);

    for (const ext of excluded) {
      selected.delete(ext);
    }

    return this.select(root, [...selected]);
  }

  outputs(root: Directory): Globs<RegularFile> {
    let globs = root.globs({ match: ["files"] });

    for (const source of this.#sources) {
      globs = StarbeamSource.addOutputs(source, globs);
    }

    return globs;
  }
}

export class StarbeamSource extends Union(
  "js:untyped",
  "js:typed",
  "jsx:typed",
  "jsx:untyped",
  "ts",
  "tsx",
  "d.ts",
  // bins are always JS
  "bin:typed",
  "bin:untyped",
  "none",
) {
  static addOutputs(
    source: StarbeamSource,
    globs: Globs<RegularFile>,
  ): Globs<RegularFile> {
    for (const ext of EXTS) {
      globs = source.#output(globs, ext);
    }

    return globs;
  }

  /**
   * Determine whether this source type includes the given extension.
   */
  has(...exts: Ext[]): boolean {
    return exts.some((e) => this.inputExtensions.includes(e));
  }

  get isJS(): boolean {
    return this.has("js");
  }

  get isTS(): boolean {
    return this.has("ts");
  }

  hasFiles(): boolean {
    return this.value !== "none";
  }

  get inputExtensions(): Extensions {
    return Extensions.of(this.#inputExtensions);
  }

  /**
   * The list of extensions that are included in this source type.
   */
  get #inputExtensions(): Ext[] {
    switch (this.value) {
      case "js:untyped":
      case "bin:untyped":
        return ["js"];
      case "js:typed":
      case "bin:typed":
        return ["js", "d.ts"];
      case "jsx:untyped":
        return ["jsx", "js"];
      case "jsx:typed":
        return ["jsx", "js", "d.ts"];
      case "ts":
        return ["ts"];
      case "tsx":
        return ["tsx", "ts"];
      case "d.ts":
        return ["d.ts"];
      case "none":
        return [];
    }
  }

  #output(globs: Globs<RegularFile>, ext: Ext): Globs<RegularFile> {
    if (!this.has(ext)) {
      globs = globs.add(`**/*.${ext}`);
    }
    return globs;
  }

  typescript(root: Directory): Globs<RegularFile> {
    return this.select(root, ["ts", "tsx", "d.ts"]);
  }

  javascript(root: Directory): Globs<RegularFile> {
    return this.select(root, ["js"]);
  }

  jsx(root: Directory): Globs<RegularFile> {
    return this.select(root, ["jsx"]);
  }

  select(
    root: Directory,
    exts: Ext[],
    globs: Globs<RegularFile> = root.globs({ match: ["files"] }),
  ): Globs<RegularFile> {
    for (const ext of exts) {
      if (this.has(ext)) {
        globs = globs.add(`**/*.${ext}`);
      }
    }

    return globs;
  }

  exclude(root: Directory, excluded: Ext[]): Globs<RegularFile> {
    const selected = new Set(EXTS);

    for (const ext of excluded) {
      selected.delete(ext);
    }

    return this.select(root, [...selected]);
  }

  outputs(root: Directory): Globs<RegularFile> {
    return StarbeamSource.addOutputs(this, root.globs({ match: ["files"] }));
  }
}

export class Extensions implements Iterable<Ext> {
  static of(extensions: Iterable<Ext>): Extensions {
    return new Extensions([...extensions]);
  }

  static from(extensions: (Extensions | Ext[])[]): Extensions {
    const exts: Ext[] = [];

    for (const ext of extensions) {
      if (Array.isArray(ext)) {
        exts.push(...ext);
      } else {
        exts.push(...ext.#extensions);
      }
    }

    return new Extensions(exts);
  }

  #extensions: Ext[];

  private constructor(extensions: Ext[]) {
    this.#extensions = extensions;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Extensions", {
      extensions: this.#extensions,
    });
  }

  [Symbol.iterator](): IterableIterator<Ext> {
    return this.#extensions[Symbol.iterator]();
  }

  get glob(): string {
    if (isSingleItemArray(this.#extensions)) {
      return getFirst(this.#extensions);
    } else {
      return `{${this.#extensions.join(",")}}`;
    }
  }

  includes(ext: Ext): boolean {
    return this.#extensions.includes(ext);
  }
}

export class JsonTemplate extends Union(
  "interfaces.package.json",
  "package.json",
  "tsconfig.json",
) {
  read(root: Directory, filter?: JsonFilter): JsonObject | undefined {
    const json = root
      .file(`workspace/scripts/templates/package/${String(this)}.template`)
      .readSync({ as: "json" });

    if (filter) {
      return JsonEntries.create(json, this.value).filter(filter);
    } else {
      return json;
    }
  }
}

export type JsonFilterType = "source" | "type";
export type JsonFilter = Record<JsonFilterType, IntoUnionInstance>;

class JsonEntries {
  static create(object: JsonObject, path: string): JsonEntries {
    return new JsonEntries(path, Object.entries(object));
  }

  readonly #path: string;
  readonly #entries: [string, JsonValue][];

  private constructor(path: string, entries: [string, JsonValue][]) {
    this.#path = path;
    this.#entries = entries;
  }

  filter(filter: JsonFilter): JsonObject | undefined {
    const switchType = this.#switchType;

    if (switchType === undefined) {
      return Object.fromEntries(this.#entries);
    }

    const { type, choices } = switchType;

    if (type in filter) {
      function normalize(into: IntoUnionInstance): string[] {
        if (typeof into === "string") {
          return [into];
        } else if (Symbol.iterator in into) {
          return [...into].map((into) => String(into));
        } else {
          return [String(into)];
        }
      }

      const actual = normalize(filter[type]);

      for (const item of actual) {
        if (item in choices) {
          return choices[item];
        }
      }
    }

    if ("default" in choices) {
      return choices["default"];
    } else {
      throw Error(
        `No default in switch:${type} (for ${
          this.#path
        }) and the given filter (${JSON.stringify(filter)}) had no matches.`,
      );
    }
  }

  get #switchType():
    | { type: JsonFilterType; choices: Record<string, JsonObject> }
    | undefined {
    const switchNode = this.#entries.find(
      ([key]) => key.startsWith("switch:") && key !== "switch:default",
    );

    if (!switchNode) {
      return;
    }

    const [key, choices] = switchNode;
    const [, switchType] = key.split(":") as ["switch", JsonFilterType];

    return {
      type: switchType,
      choices: choices as Record<string, JsonObject>,
    };
  }
}

export class Template extends Union(
  "interfaces.package.json",
  ".npmrc",
  "package.json",
  "rollup.config.mjs",
  "tsconfig.json",
  "vite.config.ts",
) {
  read(root: Directory): string {
    return root
      .file(stringify`workspace/scripts/templates/package/${this}.template`)
      .readSync();
  }
}
