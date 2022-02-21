import { tree, TreeContent, TreeRecord } from "../../debug/tree.js";
import { isObject } from "../../utils.js";

type ScalarKeys<T> = {
  [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];

export type JsonOf<T> = {
  [P in keyof T as ScalarKeys<T>]: T[P] extends Function ? never : T[P];
};

// const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class DebugFinalizer {
  static create(finalizer: string, token: string): DebugFinalizer {
    return new DebugFinalizer(finalizer, token);
  }

  readonly #finalizer: string;
  readonly #token: string;

  private constructor(finalizer: string, token: string) {
    this.#finalizer = finalizer;
    this.#token = token;
  }

  get finalizer(): string {
    return this.#finalizer;
  }

  get token(): string {
    return this.#token;
  }

  treeify(): TreeContent {
    if (this.#token === undefined) {
      return tree.value(`Finalizer(${this.#finalizer})`);
    } else {
      return tree.value(`Finalizer(${this.#finalizer}, token: ${this.#token})`);
    }
  }
}

function hasToJSON(value: unknown): value is { toJSON(): JsonValue } {
  if (!isObject(value)) return false;

  if ("toJSON" in value) {
    return typeof (value as { toJSON: unknown }).toJSON === "function";
  }

  return false;
}

function hasNonemptyConstructor(value: unknown): boolean {
  if (!isObject(value)) return false;

  if ("constructor" in value) {
    let constructor = (value as { constructor: unknown }).constructor;

    if (typeof constructor !== "function") return false;

    return typeof constructor.name === "string" && constructor.name.length > 0;
  }

  return false;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [P in string]: JsonValue };
type JsonArray = JsonValue[];

function stringify(json: JsonValue): string {
  if (Array.isArray(json)) {
    return `[ ` + json.map(stringify).join(", ") + ` ]`;
  }

  if (typeof json === "object" && json !== null) {
    return (
      `{ ` +
      Object.entries(json).map(
        ([key, value]) => `${key}: ${stringify(value)}`
      ) +
      ` }`
    );
  }

  return String(json);
}

function inspectObject(value: object): string {
  if (hasNonemptyConstructor(value)) {
    if (hasToJSON(value)) {
      return `${value.constructor.name} ${stringify(value.toJSON())}`;
    } else {
      return `#<${value.constructor.name}>`;
    }
  } else if (hasToJSON(value)) {
    return stringify(value.toJSON());
  } else {
    return `(anonymous)`;
  }
}

export class DebugObjectLifetime {
  static create(
    object: object,
    finalizers: Set<DebugFinalizer>,
    children: Set<DebugObjectLifetime>
  ): DebugObjectLifetime {
    return new DebugObjectLifetime(object, finalizers, children);
  }

  readonly #object: object;
  readonly #finalizers: Set<DebugFinalizer>;
  readonly #children: Set<DebugObjectLifetime>;

  private constructor(
    object: object,
    finalizers: Set<DebugFinalizer>,
    children: Set<DebugObjectLifetime>
  ) {
    this.#object = object;
    this.#finalizers = finalizers;
    this.#children = children;
  }

  get object(): object {
    return this.#object;
  }

  get finalizers(): readonly DebugFinalizer[] {
    return [...this.#finalizers];
  }

  get children(): readonly DebugObjectLifetime[] {
    return [...this.#children];
  }

  tree(): TreeRecord {
    return tree((t) =>
      t.entry("DebugObjectLifetime", (b) =>
        b
          .entry("object", inspectObject(this.#object))
          .list(
            "children",
            [...this.#children].map((child) => child.tree())
          )
          .list(
            "finalizers",
            [...this.#finalizers].map((finalizer) => finalizer.treeify()),
            "None"
          )
      )
    );
  }
}
