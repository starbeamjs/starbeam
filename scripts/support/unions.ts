import {
  type JsonObject,
  type JsonPrimitive,
  type JsonValue,
  isObject,
} from "./json.js";
import type { RegularFile } from "./paths.js";
import { type Directory, Globs } from "./paths.js";
import type { UnionInstance } from "./type-magic.js";
import { type IntoUnionInstance, Union } from "./type-magic.js";

export class StarbeamType extends Union(
  "interfaces",
  "library",
  "tests",
  "support:tests",
  "support:build",
  "demo:react",
  "unknown",
  "draft",
  "root",
  "none"
) {
  hasCategory(kind: "demo" | "support"): boolean {
    return this.value.startsWith(`${kind}:`);
  }
}

type Ext = "d.ts" | "js" | "jsx" | "ts" | "tsx";

const EXTS = ["d.ts", "js", "jsx", "ts", "tsx"] as const;

export class StarbeamSources extends Union(
  "js:untyped",
  "js:typed",
  "jsx:typed",
  "jsx:untyped",
  "ts",
  "tsx",
  "d.ts"
) {
  /**
   * Determine whether this source type includes the given extension.
   */
  has(ext: Ext): boolean {
    return this.inputExtensions.includes(ext);
  }

  /**
   * The list of extensions that are included in this source type.
   */
  get inputExtensions(): Ext[] {
    switch (this.value) {
      case "js:untyped":
        return ["js"];
      case "js:typed":
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
    }
  }

  #add(globs: Globs<RegularFile>, ext: Ext): Globs<RegularFile> {
    if (this.has(ext)) {
      globs = globs.add(`**/*.${ext}`);
    }
    return globs;
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

  select(root: Directory, exts: Ext[]): Globs<RegularFile> {
    let globs = Globs.root(root, { match: ["files"] });

    for (const ext of exts) {
      globs = this.#add(globs, ext);
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
    let globs = Globs.root(root, { match: ["files"] });

    for (const ext of EXTS) {
      globs = this.#output(globs, ext);
    }

    return globs;
  }
}

export class JsonTemplate extends Union(
  "interfaces.package.json",
  "package.json",
  "tsconfig.json"
) {
  read(
    root: Directory,
    filter?: [kind: string, value: IntoUnionInstance]
  ): JsonObject {
    const json = root
      .file(`scripts/templates/package/${this}.template`)
      .readSync({ as: "json" });

    if (filter) {
      return JsonEntries.create(json, this.value).filter(filter);
    } else {
      return json;
    }
  }
}

export type JsonFilter = [type: string, value: string | UnionInstance<string>];

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

  filter(filter: JsonFilter): JsonObject {
    const entries = this.#entries;

    const staticEntries = entries.filter(([key]) => !key.startsWith("switch:"));

    return {
      ...Object.fromEntries(staticEntries),
      ...this.#objectFor(filter[0], String(filter[1])),
    };
  }

  #objectFor(type: string, value: string): JsonObject {
    const switchNode = this.#entries.find(([key]) =>
      key.startsWith(`switch:${type}`)
    );

    if (!switchNode) {
      return {};
    }

    const [key, switchValue] = switchNode;

    this.#assert(type, switchValue);

    if (value in switchValue) {
      return this.#asserting(`${type}:${key}`, switchValue[value]);
    } else if ("default" in switchValue) {
      return this.#asserting(`${type}:default`, switchValue.default);
    } else {
      return {};
    }
  }

  #assert(key: string, value: JsonValue): asserts value is JsonObject {
    if (!isObject(value)) {
      throw Error(
        `Malformed switch entry for switch:${key} in ${
          this.#path
        }: ${value}\n\nA switch entry and its children must be objects, but the value is a ${typeof value}.`
      );
    }
  }

  #asserting(key: string, value: JsonValue): JsonObject {
    this.#assert(key, value);
    return value;
  }

  #isMalformed = (
    entry: [string, JsonValue]
  ): entry is [string, JsonPrimitive] =>
    (entry[0].startsWith("if:") || entry[0] === "else") && !isObject(entry[1]);

  #isStatic = (entry: [string, JsonValue]): boolean =>
    !this.#isConditional(entry);

  #isConditional = (
    entry: [string, JsonValue]
  ): entry is [string, JsonObject] =>
    (entry[0].startsWith("if:") || entry[0] === "else") && isObject(entry[1]);
}

export class Template extends Union(
  "interfaces.package.json",
  ".npmrc",
  "package.json",
  "rollup.config.mjs",
  "tsconfig.json",
  "vite.config.ts"
) {
  read(root: Directory): string {
    return root.file(`scripts/templates/package/${this}.template`).readSync();
  }
}
