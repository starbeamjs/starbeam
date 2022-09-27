/* eslint-disable @typescript-eslint/no-explicit-any */
// Unfortunately, TypeScript's ability to do inference *or* type-checking in a
// `Proxy`'s body is very limited, so we have to use a number of casts `as any`
// to make the internal accesses work. The type safety of these is guaranteed at
// the *call site* instead of within the body: you cannot do `Array.blah` in TS,
// and it will blow up in JS in exactly the same way, so it is safe to assume
// that properties within the getter have the correct type in TS.

import { type Description, callerStack } from "@starbeam/debug";
import type { Stack } from "@starbeam/interfaces";

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

function convertToInt(prop: PropertyKey): number | null {
  if (typeof prop === "symbol") return null;

  const num = Number(prop);

  if (isNaN(num)) return null;

  return num % 1 === 0 ? num : null;
}

type Fn = (...args: any[]) => any;

class Shadow<T> {
  static create<T>(target: T[], collection: Collection<number>): Shadow<T> {
    return new Shadow(new Map(), target, collection);
  }

  readonly #fns: Map<PropertyKey, Fn>;
  readonly #target: T[];
  readonly #collection: Collection<number>;

  private constructor(
    fns: Map<string, Fn>,
    target: T[],
    collection: Collection<number>
  ) {
    this.#fns = fns;
    this.#target = target;
    this.#collection = collection;
  }

  #getterMethod(prop: ArrayMethodName): Fn | undefined {
    let fn = this.#fns.get(prop);

    if (!fn) {
      fn = (...args: unknown[]) => {
        this.#collection.iterateKeys(callerStack());
        // eslint-disable-next-line
        return (this.#target as any)[prop](...args);
      };

      this.#fns.set(prop, fn);
    }

    return fn;
  }

  #setterMethod(name: ArrayMethodName) {
    let fn = this.#fns.get(name);

    if (!fn) {
      fn = (...args: unknown[]) => {
        const caller = callerStack();
        const prev = this.#target.length;

        // eslint-disable-next-line
        const result = (this.#target as any)[name](...args);

        const next = this.#target.length;

        if (prev !== 0 || next !== 0) {
          this.#collection.splice(caller);
        }

        // eslint-disable-next-line
        return result;
      };
    }

    return fn;
  }

  at(index: number, caller: Stack) {
    this.#collection.get(
      index,
      index in this.#target ? "hit" : "miss",
      member(index),
      caller
    );
    this.#collection.iterateKeys(caller);

    return this.#target[index];
  }

  updateAt(index: number, value: T, caller: Stack) {
    const current = this.#target[index];

    if (Object.is(current, value)) {
      return;
    }

    this.#collection.splice(caller);
    this.#collection.set(index, "key:changes", member(index), caller);

    this.#target[index] = value;
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

  set(prop: PropertyKey, value: unknown, caller: Stack): void {
    this.#collection.splice(caller);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (this.#target as UnsafeIndex)[prop] = value;
  }

  getterMethod(name: ArrayMethodName) {
    return this.#getterMethod(name);
  }

  setterMethod(name: ArrayMethodName) {
    return this.#setterMethod(name);
  }

  updateLength(to: number, caller: Stack) {
    // This happens when popping an empty array, for example.
    if (this.#target.length === to) {
      return;
    } else {
      this.#collection.splice(caller);
    }
  }
}

export default class TrackedArray<T = unknown> {
  constructor(description: Description, arr: T[] = []) {
    Object.freeze(arr);

    const target = [...arr];

    // eslint-disable-next-line
    const proxy: T[] = new Proxy(target, {
      get(target, prop /*, _receiver */) {
        if (prop === "length") {
          collection.iterateKeys(callerStack());
          return target.length;
        }

        const index = convertToInt(prop);

        if (index === null) {
          return shadow.get(prop);
        } else {
          return shadow.at(index, callerStack());
        }
      },

      set(target, prop, value /*, _receiver */) {
        const index = convertToInt(prop);
        const caller = callerStack();

        if (prop === "length") {
          shadow.updateLength(value as number, caller);

          if (value === target.length) {
            return true;
          }
        }

        if (index === null) {
          shadow.set(prop, value, caller);
        } else if (index in target) {
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

function member(prop: string | number | symbol) {
  if (typeof prop === "string") {
    return `.${prop}`;
  } else {
    return `[${String(prop)}]`;
  }
}
