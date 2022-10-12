import { inspect } from "node:util";
import type { EditJsonc, JsoncPosition } from "../jsonc.js";
import type { ChangeResult } from "../reporter/reporter.js";

type Migration =
  | {
      type: "set";
      path: string;
      value: unknown;
      position?: EditPosition;
    }
  | {
      type: "remove";
      path: string;
    }
  | {
      type: "add:unique";
      path: string;
      value: unknown;
      check: (json: unknown) => boolean;
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

  remove<K extends DeepKeyOf<R>>(path: K): Migrator<R> {
    this.#migrations.push({ type: "remove", path });
    return this;
  }

  set<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepIndex<R, K>,
    position?: EditPosition
  ): Migrator<R> {
    this.#migrations.push({ type: "set", path, value, position });
    return this;
  }

  add<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K>,
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean }
  ): Migrator<R> {
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
                }\`: ${inspect(value)}\n\n${e}`
              );
              throw e;
            }
          });
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

function positionOption(position: EditPosition = "end"): JsoncPosition {
  if (position === "start") {
    return { position: 0 };
  } else if (position === "end") {
    return { position: -1 };
  } else if ("before" in position) {
    return { position: (others: string[]) => others.indexOf(position.before) };
  } else if ("after" in position) {
    return {
      position: (others: string[]) => others.indexOf(position.after) + 1,
    };
  } else {
    throw new Error("Invalid position");
  }
}
