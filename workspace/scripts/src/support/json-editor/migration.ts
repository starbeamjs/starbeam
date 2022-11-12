import { inspect } from "node:util";

import type { ChangeResult } from "@starbeam-workspace/reporter";
import { DisplayStruct } from "@starbeam-workspace/shared";

import type { EditJsonc, JsoncPosition } from "../jsonc.js";

const console = globalThis.console;

type Migration =
  | {
      type: "set";
      path: string;
      value: unknown;
      position?: EditPosition | undefined;
    }
  | {
      type: "remove";
      path: string;
    }
  | {
      type: "add:unique";
      path: string;
      value: string | number | boolean;
      check: (json: unknown) => boolean;
    }
  | {
      type: "remove:unique";
      path: string;
      value: string | number | boolean | ((json: unknown) => boolean);
    };

export class Migrator<R extends object> {
  static create<T extends object>(editor: EditJsonc): Migrator<T> {
    return new Migrator(editor);
  }

  readonly #editor: EditJsonc;
  readonly #migrations: Migration[] = [];

  constructor(editor: EditJsonc) {
    this.#editor = editor;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Migrator", { migrations: this.#migrations });
  }

  remove<K extends DeepKeyOf<R>>(path: K): this {
    this.#migrations.push({ type: "remove", path });
    return this;
  }

  set<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepIndex<R, K>,
    position?: EditPosition
  ): this {
    this.#migrations.push({ type: "set", path, value, position });
    return this;
  }

  removeFrom<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined
  ): this {
    const check = options?.matches ?? ((prev) => prev === value);
    this.#migrations.push({
      type: "add:unique",
      path,
      value,
      check: check as (json: unknown) => boolean,
    });
    return this;
  }

  array<K extends DeepKeyOf<R>>(
    path: K,
    update: (updater: UpdatePath<R, K>) => void
  ): this {
    update(new UpdatePath(this.#migrations, path));
    return this;
  }

  addTo<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K> & (string | number | boolean)
  ): this;
  addTo<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K>,
    options: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined
  ): this;
  addTo<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined
  ): this {
    const check = options?.matches ?? ((prev) => prev === value);
    this.#migrations.push({
      type: "add:unique",
      path,
      value,
      check: check as (json: unknown) => boolean,
    });
    return this;
  }

  migrate(): void {
    for (const migration of this.#migrations) {
      switch (migration.type) {
        case "set": {
          this.#editor.set(
            migration.path,
            migration.value,
            positionOption(migration.position)
          );
          break;
        }
        case "remove":
          this.#editor.remove(migration.path);
          break;
        case "add:unique":
          this.#editor.addUnique(migration.path, migration.value, (value) => {
            try {
              return migration.check(value);
            } catch (e) {
              console.error(
                `Error while checking migration value at \`${
                  migration.path
                }\`: ${inspect(value)}\n\n${String(e)}`
              );
              throw e;
            }
          });
          break;
        case "remove:unique":
          this.#editor.removeUnique(migration.path, migration.value);
          break;
      }
    }
  }

  write(): ChangeResult {
    this.migrate();
    return this.#editor.write();
  }
}

type DeepKeyOf<T> = (
  [T] extends [never]
    ? ""
    : T extends object
    ? {
        [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<DeepKeyOf<T[K]>>}`;
      }[Exclude<keyof T, symbol>]
    : ""
) extends infer D
  ? Extract<D, string>
  : never;

type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`;

type DeepIndex<T, K extends string> = T extends object
  ? string extends K
    ? never
    : K extends keyof T
    ? T[K]
    : K extends `${infer F}.${infer R}`
    ? F extends keyof T
      ? DeepIndex<T[F], R>
      : never
    : never
  : never;

type DeepArrayAdd<T, K extends string> = DeepIndex<T, K> extends
  | (infer E)[]
  | undefined
  ? E
  : never;

type EditPosition = "start" | "end" | { before: string } | { after: string };

const NEXT_POSITION = 1;

function positionOption(position: EditPosition = "end"): JsoncPosition {
  if (position === "start") {
    return { position: 0 };
  } else if (position === "end") {
    return { position: -1 };
  } else if ("before" in position) {
    return { position: (others: string[]) => others.indexOf(position.before) };
  } else if ("after" in position) {
    return {
      position: (others: string[]) =>
        others.indexOf(position.after) + NEXT_POSITION,
    };
  } else {
    throw new Error("Invalid position");
  }
}

class UpdatePath<R extends object, K extends DeepKeyOf<R>> {
  readonly #migrations: Migration[];
  readonly #path: K;

  constructor(migrations: Migration[], path: K) {
    this.#migrations = migrations;
    this.#path = path;
  }

  remove(value: DeepArrayAdd<R, K> & (string | number | boolean)): this;
  remove(
    value: DeepArrayAdd<R, K>,
    options: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined
  ): this;
  remove(
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined
  ): this {
    const check = options?.matches ?? ((prev) => prev === value);
    this.#migrations.push({
      type: "remove:unique",
      path: this.#path,
      value: check as (json: unknown) => boolean,
    });
    return this;
  }

  add(value: DeepArrayAdd<R, K> & (string | number | boolean)): this;
  add(
    value: DeepArrayAdd<R, K>,
    options: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined
  ): this;
  add(
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined
  ): this {
    const check = options?.matches ?? ((prev) => prev === value);
    this.#migrations.push({
      type: "add:unique",
      path: this.#path,
      value,
      check: check as (json: unknown) => boolean,
    });
    return this;
  }
}
