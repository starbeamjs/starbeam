import { Path as FinnairPath } from "@finnair/path";
import { parsePath } from "@finnair/path-parser";
import { DisplayStruct } from "@starbeam/core-utils";
import type {
  InsertIntoObjectOptions,
  jsonc,
  JsonModification,
  ModifiableSourceRoot,
  SourceRoot,
} from "@starbeam-workspace/edit-json";
import type { ChangeResult } from "@starbeam-workspace/shared";
import type { JsonValue } from "typed-json-utils";

/*
  eslint-disable
  unused-imports/no-unused-vars
  -- Documentation to be used in `@see` references.
*/
type RESERVED_FOR_PUBLIC_PACKAGE = `
This API is not currently used in this workspace, but it may be useful
if we extract this into a public package in the future.
`;
/* eslint-enable unused-imports/no-unused-vars */

const console = globalThis.console;

type Migration =
  | {
      type: "set";
      path: FinnairPath;
      key: string;
      value: JsonValue;
      position?: InsertIntoObjectOptions | undefined;
    }
  | {
      type: "remove";
      path: FinnairPath;
      key: string;
    }
  | {
      type: "add:unique";
      path: FinnairPath;
      value: string | number | boolean;
      check: (json: JsonValue) => boolean;
    }
  | {
      type: "remove:unique";
      path: FinnairPath;
      value: string | number | boolean | ((json: JsonValue) => boolean);
    };

export function displayMigration(migration: Migration): object {
  switch (migration.type) {
    case "set":
      return DisplayStruct(
        "Migration",
        {
          path: migration.path,
          key: migration.key,
          value: migration.value,
          position: migration.position,
        },
        { description: "set" },
      );
    case "remove":
      return DisplayStruct(
        "Migration",
        {
          path: migration.path,
          key: migration.key,
        },
        { description: "remove" },
      );
    case "add:unique":
      return DisplayStruct(
        "Migration",
        {
          path: migration.path,
          value: migration.value,
          check: String(migration.check),
        },
        { description: "add:unique" },
      );
    case "remove:unique":
      return DisplayStruct(
        "Migration",
        {
          path: migration.path,
          value:
            typeof migration.value === "function"
              ? String(migration.value)
              : migration.value,
        },
        { description: "remove:unique" },
      );
  }
}

export class Migrator<R extends object> {
  static create<T extends object>(root: SourceRoot): Migrator<T> {
    return new Migrator(root.modifiable());
  }

  readonly #root: ModifiableSourceRoot;
  readonly #migrations: Migration[] = [];

  constructor(root: ModifiableSourceRoot) {
    this.#root = root;
  }

  /**
   * @public
   */
  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Migrator", {
      migrations: this.#migrations.map(displayMigration),
    });
  }

  remove<K extends DeepKeyOf<R>>(path: K): this {
    const { parent, tail } = parseEntryJsonPath(path);

    this.#migrations.push({ type: "remove", path: parent, key: tail });
    return this;
  }

  set<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepIndex<R, K>,
    position?: EditObjectPosition,
  ): this {
    const { parent, tail } = parseEntryJsonPath(path);

    this.#migrations.push({
      type: "set",
      path: parent,
      key: tail,
      value,
      position: positionToObjectOptions(position),
    });
    return this;
  }

  /**
   * @public
   * @see {RESERVED_FOR_PUBLIC_PACKAGE}
   */
  removeFrom<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined,
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
    update: (updater: UpdatePath<R, K>) => void,
  ): this {
    update(new UpdatePath(this.#migrations, path));
    return this;
  }

  /**
   * @public
   * @see {RESERVED_FOR_PUBLIC_PACKAGE}
   */
  addTo<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K> & (string | number | boolean),
  ): this;
  addTo<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K>,
    options: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined,
  ): this;
  addTo<K extends DeepKeyOf<R>>(
    path: K,
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined,
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
    for (const modification of this.#modifications()) {
      if (modification.hasChanges()) {
        console.log({ modification: modification });

        this.#root.applyModifications([modification]);
      }
    }
  }

  *#modifications(): Generator<JsonModification, void, unknown> {
    for (const migration of this.#migrations) {
      switch (migration.type) {
        case "set": {
          const jsoncPath = [...migration.path];

          yield* ifPresent(
            this.#root
              .getObjectAt(jsoncPath)
              ?.set(migration.key, migration.value, migration.position),
          );

          break;
        }
        case "remove": {
          const jsoncPath = [...migration.path];

          yield* ifPresent(
            this.#root.getObjectAt(jsoncPath)?.delete(migration.key),
          );

          break;
        }

        case "add:unique":
          {
            const jsoncPath = [...migration.path];

            yield* ifPresent(
              this.#root
                .getArrayAt(jsoncPath)
                ?.append(migration.value, { unique: migration.check }),
            );
          }

          break;
        case "remove:unique":
          {
            const jsoncPath = [...migration.path];

            yield* ifPresent(
              this.#root
                .getArrayAt(jsoncPath)
                ?.removeMatches((v) => Object.is(v, migration.value)),
            );
          }

          break;
      }
    }
  }

  async write(
    write: (source: string) => Promise<void> | void,
  ): Promise<ChangeResult> {
    this.migrate();
    return this.#root.flush(write);
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

type EditObjectPosition = "start" | "end" | { after: string };

function positionToObjectOptions(
  position: EditObjectPosition | undefined,
): InsertIntoObjectOptions | undefined {
  if (position === undefined) return undefined;

  if (typeof position === "string") {
    return { position };
  } else {
    return { position: "after", ...position };
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
    options: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined,
  ): this;
  remove(
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined,
  ): this {
    const check = options?.matches ?? ((prev) => prev === value);
    this.#add({
      type: "remove:unique",
      path: this.#path,
      value: check as (json: unknown) => boolean,
    });
    return this;
  }

  add(value: DeepArrayAdd<R, K> & (string | number | boolean)): this;
  add(
    value: DeepArrayAdd<R, K>,
    options: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined,
  ): this;
  add(
    value: DeepArrayAdd<R, K> & (string | number | boolean),
    options?: { matches: (prev: DeepArrayAdd<R, K>) => boolean } | undefined,
  ): this {
    const check = options?.matches ?? ((prev) => prev === value);
    this.#add({
      type: "add:unique",
      path: this.#path,
      value,
      check: check as (json: unknown) => boolean,
    });
    return this;
  }

  #add(migration: Migration): void {
    this.#migrations.push(migration);
  }
}

function* ifPresent<T>(
  value: T | null | undefined,
): Generator<T, void, unknown> {
  if (value !== undefined && value !== null) {
    yield value;
  }
}

function parseEntryJsonPath(path: string): {
  parent: FinnairPath;
  tail: string;
} {
  const parsed = parseJsonPath(path);

  if (!parsed) {
    // @fixme report this error
    throw Error(`Unable to parse JSONPath: ${String(path)}`);
  }

  const { parent, tail } = parsed;
  if (typeof tail === "number") {
    throw Error(
      `Unable to apply a remove migration to ${String(
        path,
      )} (the path refers to an array element, not a key in an object)`,
    );
  }

  return { parent, tail };
}

function parseJsonPath(path: string):
  | {
      parent: FinnairPath;
      tail: jsonc.Segment;
    }
  | undefined {
  const parsedPath = [...parsePath(`$.${path}`)];
  const tail = parsedPath.pop();

  return tail === undefined
    ? undefined
    : { parent: FinnairPath.of(...parsedPath), tail };
}
