/* eslint-disable @typescript-eslint/no-explicit-any */
// Unfortunately, TypeScript's ability to do inference *or* type-checking in a
// `Proxy`'s body is very limited, so we have to use a number of casts `as any`
// to make the internal accesses work. The type safety of these is guaranteed at
// the *call site* instead of within the body: you cannot do `Array.blah` in TS,
// and it will blow up in JS in exactly the same way, so it is safe to assume
// that properties within the getter have the correct type in TS.

import type { CallStack, Description } from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/reactive";

import { Collection } from "./collection.js";

type GetterMethod<T, P extends keyof T> = T[P] extends (...args: any[]) => any
  ? P
  : never;

type ArrayMethodName = keyof {
  [P in keyof unknown[] as GetterMethod<unknown[], P>]: P;
};

type UnsafeIndex = any;

const ARRAY_GETTER_METHODS = new Set<ArrayMethodName>([
  Symbol.iterator,
  "concat",
  "entries",
  "every",
  "fill",
  "filter",
  "find",
  "findIndex",
  "flat",
  "flatMap",
  "forEach",
  "includes",
  "indexOf",
  "join",
  "keys",
  "lastIndexOf",
  "map",
  "reduce",
  "reduceRight",
  "slice",
  "some",
  "values",
]);

const ARRAY_SETTER_METHODS = new Set<ArrayMethodName>([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

function isGetterMethod(prop: PropertyKey): prop is ArrayMethodName {
  return ARRAY_GETTER_METHODS.has(prop as ArrayMethodName);
}

function isSetterMethod(prop: PropertyKey): prop is ArrayMethodName {
  return ARRAY_SETTER_METHODS.has(prop as ArrayMethodName);
}

const EMPTY_SIZE = 0;

function convertToInt(prop: PropertyKey): number | null {
  if (typeof prop === "symbol") return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return Number.isInteger(num) ? num : null;
}

type Fn = (...args: any[]) => any;

class Shadow<T> {
  readonly #collection: Collection<number>;
  readonly #fns: Map<PropertyKey, Fn>;
  readonly #target: T[];

  static create<T>(target: T[], collection: Collection<number>): Shadow<T> {
    return new Shadow(new Map(), target, collection);
  }

  private constructor(
    fns: Map<string, Fn>,
    target: T[],
    collection: Collection<number>
  ) {
    this.#fns = fns;
    this.#target = target;
    this.#collection = collection;
  }

  at(index: number, caller: CallStack | undefined): T | undefined {
    this.#collection.get(
      index,
      index in this.#target ? "hit" : "miss",
      member(index),
      caller
    );
    this.#collection.iterateKeys(caller);

    return this.#target[index];
  }

  #createGetterMethod(prop: ArrayMethodName): Fn | undefined {
    let fn = this.#fns.get(prop);

    if (!fn) {
      fn = (...args: unknown[]) => {
        this.#collection.iterateKeys(DEBUG.callerStack?.());
        // eslint-disable-next-line
        return (this.#target as any)[prop](...args);
      };

      this.#fns.set(prop, fn);
    }

    return fn;
  }

  #createSetterMethod(name: ArrayMethodName): Fn {
    let fn = this.#fns.get(name);

    if (!fn) {
      fn = (...args: unknown[]) => {
        const caller = DEBUG.callerStack?.();
        const prev = this.#target.length;

        // eslint-disable-next-line
        const result = (this.#target as any)[name](...args);

        const next = this.#target.length;

        if (prev !== EMPTY_SIZE || next !== EMPTY_SIZE) {
          this.#collection.splice(caller);
        }

        // eslint-disable-next-line
        return result;
      };
    }

    return fn;
  }

  get(prop: PropertyKey): unknown {
    if (isGetterMethod(prop)) {
      return this.getterMethod(prop);
    } else if (isSetterMethod(prop)) {
      return this.setterMethod(prop);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return (this.#target as UnsafeIndex)[prop];
    }
  }

  getterMethod(name: ArrayMethodName): Fn | undefined {
    return this.#createGetterMethod(name);
  }

  set(prop: PropertyKey, value: unknown, caller: CallStack | undefined): void {
    this.#collection.splice(caller);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (this.#target as UnsafeIndex)[prop] = value;
  }

  setterMethod(name: ArrayMethodName): Fn {
    return this.#createSetterMethod(name);
  }

  updateAt(index: number, value: T, caller: CallStack | undefined): void {
    const current = this.#target[index];

    if (Object.is(current, value)) {
      return;
    }

    this.#collection.splice(caller);
    this.#collection.set(index, "key:changes", member(index), caller);

    this.#target[index] = value;
  }

  updateLength(to: number, caller: CallStack | undefined): void {
    // This happens when popping an empty array, for example.
    if (this.#target.length === to) {
      return;
    } else {
      this.#collection.splice(caller);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class TrackedArray<T = unknown> {
  constructor(description: Description | undefined, arr: T[] = []) {
    Object.freeze(arr);

    const target = [...arr];

    const proxy: T[] = new Proxy(target, {
      get(getterTarget, prop /*, _receiver */) {
        if (prop === "length") {
          collection.iterateKeys(DEBUG.callerStack?.());
          return getterTarget.length;
        }

        const index = convertToInt(prop);

        if (index === null) {
          return shadow.get(prop);
        } else {
          return shadow.at(index, DEBUG.callerStack?.());
        }
      },

      set(setterTarget, prop, value /*, _receiver */) {
        const index = convertToInt(prop);
        const caller = DEBUG.callerStack?.();

        if (prop === "length") {
          shadow.updateLength(value as number, caller);

          if (value === setterTarget.length) {
            return true;
          }
        }

        if (index === null) {
          shadow.set(prop, value, caller);
        } else if (index in setterTarget) {
          shadow.updateAt(index, value as T, caller);
        } else {
          shadow.set(prop, value, caller);
        }

        return true;
      },

      getPrototypeOf() {
        return TrackedArray.prototype;
      },
    });

    const collection = Collection.create<number>(description, proxy);

    const shadow = Shadow.create(target, collection);

    return proxy;
  }
}

// Ensure instanceof works correctly
Object.setPrototypeOf(TrackedArray.prototype, Array.prototype);

function member(prop: string | number | symbol): string {
  if (typeof prop === "string") {
    return `.${prop}`;
  } else {
    return `[${String(prop)}]`;
  }
}
