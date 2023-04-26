import {
  getFirst,
  getLast,
  nullifyEmptyArray,
  type PresentArray,
  withoutFirst,
} from "@starbeam/core-utils";
import type {
  CallStack,
  DescriptionDetails,
  EntryPoint,
  EntryPointDescription,
  EntryPointDescriptionArg,
} from "@starbeam/interfaces";

import { describe } from "../description/debug/describe.js";
import { ABSTRACTION_FRAME, callerStack } from "./debug/stack.js";

export class EntryPoints {
  static default(): EntryPoints {
    return new EntryPoints(undefined);
  }

  static current(this: void): EntryPoint | undefined {
    return ENTRY_POINTS.#entry;
  }

  static mark(
    this: void,
    options?:
      | {
          caller?: CallStack | undefined;
          description?: EntryPointDescriptionArg | string | undefined;
          force?: boolean | undefined;
        }
      | EntryPointDescriptionArg
      | EntryPoint
      | string
  ): EntryPoint {
    if (options instanceof EntryPointImpl) {
      ENTRY_POINTS.#upsert(options, false);
      return options;
    }

    let caller: CallStack | undefined;
    let description: EntryPointDescriptionArg | undefined;
    let force = false;

    if (typeof options === "string") {
      caller = callerStack(ABSTRACTION_FRAME);
      description = ["label", options];
      force = false;
    } else if (Array.isArray(options)) {
      caller = callerStack(ABSTRACTION_FRAME);
      description = options;
      force = false;
    } else if (options === undefined) {
      caller = callerStack(ABSTRACTION_FRAME);
      description = ["label", getFirst(caller?.frames)?.action ?? "unknown"];
      force = false;
    } else {
      caller = callerStack(ABSTRACTION_FRAME);
      description = ["label", getFirst(caller?.frames)?.action ?? "unknown"];
      force = false;
    }

    return ENTRY_POINTS.mark(caller, description, force);
  }

  #entry: EntryPointImpl | undefined;

  private constructor(entry: EntryPointImpl | undefined) {
    this.#entry = entry;
  }

  mark(
    caller: CallStack | undefined,
    description: EntryPointDescriptionArg,
    force: boolean
  ): EntryPoint {
    return this.#upsert(createEntryPoint(caller, description), force);
  }

  #upsert(entry: EntryPointImpl, force: boolean): EntryPoint {
    if (!this.#entry || force) {
      this.#entry = entry;
    } else {
      this.#entry.pushImplementation(entry);
    }

    return entry;
  }
}

const ENTRY_POINTS = EntryPoints.default();

export const markEntryPoint = EntryPoints.mark;
export const getEntryPoint = EntryPoints.current;

function createEntryPoint(
  caller: CallStack | undefined,
  description: EntryPointDescriptionArg | undefined
): EntryPointImpl {
  return new EntryPointImpl(
    caller,
    description ? new EntryPointDescriptionImpl(description) : undefined
  );
}

class EntryPointDescriptionImpl implements EntryPointDescription {
  readonly #arg: EntryPointDescriptionArg;

  constructor(arg: EntryPointDescriptionArg) {
    this.#arg = arg;
  }

  get label(): string {
    const arg = this.#arg;

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    switch (arg[0]) {
      case "object:get":
      case "object:set":
      case "object:has":
      case "object:call":
      case "object:define":
      case "object:delete":
      case "object:meta:get": {
        return index(arg);
      }

      case "function:call": {
        const [, entity] = arg;
        return `call ${describeEntity(entity)}`;
      }

      case "object:meta:keys": {
        const [, entity] = arg;
        return `get meta:keys ${describeEntity(entity)}`;
      }

      case "collection:has":
      case "collection:get":
      case "collection:insert":
      case "collection:delete": {
        return collectionOp(arg);
      }

      case "reactive:read":
      case "reactive:write":
      case "reactive:call": {
        return reactiveOp(arg);
      }

      case "label":
        return getLast(arg);

      default:
        assertNever(arg);
    }
  }
}

function assertNever(arg: never): never {
  throw new Error(`Unexpected argument: ${stringify(arg)}`);
}

type ObjectOp =
  | "get"
  | "set"
  | "has"
  | "call"
  | "define"
  | "delete"
  | "meta:get";
type FullObjectOp = `object:${ObjectOp}`;

function stringify(value: unknown): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return value;
    case "bigint":
    case "boolean":
    case "number":
    case "symbol":
    case "undefined":
      return String(value);
    case "function":
      return `${value.name || "anonymous"}`;
    case "object":
      return Array.isArray(value) ? `{array}` : `{object}`;
    default:
      return `{${typeof value}}`;
  }
}

function collectionOp(
  arg: [
    operation:
      | "collection:has"
      | "collection:get"
      | "collection:insert"
      | "collection:delete",
    entity: DescriptionDetails | string | undefined,
    key: unknown
  ]
): string {
  const [fullOp, entity, key] = arg;
  const op = fullOp.slice("collection:".length);
  return `${describeEntity(entity)}->${op}(${stringify(key)})`;
}

function reactiveOp(
  arg: [
    operation: "reactive:read" | "reactive:write" | "reactive:call",
    entity: DescriptionDetails | string | undefined,
    api: ["object:get" | "object:set" | "object:call", PropertyKey]
  ]
): string {
  const [fullOp, entity, [apiType, key]] = arg;
  switch (apiType) {
    case "object:get":
    case "object:set":
      return `${fullOpDesc(fullOp)} ${describeEntity(entity)}${indexTail(key)}`;
    case "object:call":
      return `${fullOpDesc(fullOp)} ${describeEntity(entity)}${indexTail(
        key
      )}()`;
  }
}

function fullOpDesc(
  fullOp: "reactive:read" | "reactive:write" | "reactive:call"
): string {
  switch (fullOp) {
    case "reactive:read":
      return "reactive";
    case "reactive:write":
      return "reactive write";
    case "reactive:call":
      return "reactive";
  }
}

function indexTail(key: PropertyKey) {
  if (typeof key === "string") {
    return `.${key}`;
  } else {
    return `[${String(key)}]`;
  }
}

function index(
  args: [
    operation: FullObjectOp,
    entity: DescriptionDetails | string | undefined,
    target: PropertyKey
  ]
): string {
  const [operation, entity, key] = args;
  const entityDesc = describeEntity(entity);

  return `${opLabel(operation)} ${entityDesc}.${indexTail(key)}`;
}

function opLabel(op: FullObjectOp) {
  if (op === "object:meta:get") return "get meta";

  return withoutFirst(op.split(":")).join(" ");
}

function describeEntity(
  entity: DescriptionDetails | string | undefined
): string {
  if (entity === undefined) return "{unknown}";
  return typeof entity === "string" ? entity : describe(entity);
}

class EntryPointImpl implements EntryPoint {
  static create(
    caller: CallStack | undefined,
    description: EntryPointDescriptionArg | undefined
  ): EntryPoint {
    return new EntryPointImpl(
      caller,
      description ? new EntryPointDescriptionImpl(description) : undefined
    );
  }

  readonly #caller: CallStack | undefined;
  readonly #description: EntryPointDescriptionImpl | undefined;
  readonly #implementation: EntryPoint[] = [];

  constructor(
    caller: CallStack | undefined,
    description: EntryPointDescriptionImpl | undefined
  ) {
    this.#caller = caller;
    this.#description = description;
  }

  get label() {
    return this.#description?.label ?? "api";
  }

  get description(): EntryPointDescription | undefined {
    return this.#description;
  }

  get caller(): CallStack | undefined {
    return this.#caller;
  }

  get implementation(): PresentArray<EntryPoint> | null {
    return nullifyEmptyArray(this.#implementation);
  }

  pushImplementation(entry: EntryPoint): void {
    this.#implementation.push(entry);
  }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test("inferred entry point", () => {
    const hello = api();
    expect(hello).toBe("hello");
    expect(getEntryPoint()?.description?.label).toBe("api");

    function api() {
      markEntryPoint();
      return "hello";
    }
  });
}
