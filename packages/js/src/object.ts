import { type Description, callerStack } from "@starbeam/debug";
import type { Stack } from "@starbeam/interfaces";

import { Collection } from "./collection.js";

export default class TrackedObject {
  static reactive<T extends object>(description: Description, obj: T): T {
    return new TrackedObject(description, obj) as T;
  }

  private constructor(description: Description, obj: object) {
    // copy the properties from the object to the proxy, but preserve getters and setters
    const target = Object.create(null) as object;
    for (const key of Object.getOwnPropertyNames(obj)) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, key);
      if (descriptor) {
        Object.defineProperty(target, key, descriptor);
      }
    }
    // const target = { ...obj };

    const proxy = new Proxy(target, {
      defineProperty(target, key, descriptor) {
        const caller = callerStack();

        define(key, descriptor, caller);
        return true;
      },

      deleteProperty(target, prop) {
        if (Reflect.has(target, prop)) {
          const caller = callerStack();

          collection.delete(prop, caller);
          Reflect.deleteProperty(target, prop);
        }

        return true;
      },

      get(target, prop, _receiver) {
        const caller = callerStack();

        collection.get(
          prop,
          Reflect.has(target, prop) ? "hit" : "miss",
          member(prop),
          caller
        );
        return Reflect.get(target, prop) as unknown;
      },

      getOwnPropertyDescriptor(target, prop) {
        const caller = callerStack();

        collection.get(
          prop,
          Reflect.has(target, prop) ? "hit" : "miss",
          member(prop),
          caller
        );
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },

      getPrototypeOf() {
        return TrackedObject.prototype;
      },

      has(target, prop) {
        const caller = callerStack();

        const has = Reflect.has(target, prop);
        collection.check(prop, has ? "hit" : "miss", member(prop), caller);
        return has;
      },

      isExtensible(target) {
        return Reflect.isExtensible(target);
      },

      ownKeys(target) {
        const caller = callerStack();

        collection.iterateKeys(caller);
        return Reflect.ownKeys(target);
      },

      preventExtensions(target) {
        return Reflect.preventExtensions(target);
      },

      set(target: object, prop: PropertyKey, value: unknown, _receiver) {
        const caller = callerStack();

        const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

        if (descriptor === undefined || isDataProperty(descriptor)) {
          const updates = Descriptor.updates(target, prop, {
            value,
          });

          if (updates.isNoop) {
            return true;
          }

          collection.set(prop, updates.disposition, member(prop), caller);
        }

        Reflect.set(target, prop, value);
        return true;
      },

      setPrototypeOf() {
        return false;
      },
    });

    const collection = Collection.create<PropertyKey>(description, proxy);

    return proxy;

    function define(
      key: PropertyKey,
      descriptor: PropertyDescriptor,
      caller: Stack
    ) {
      const updates = Descriptor.updates(target, key, descriptor);

      if (updates.isNoop) {
        return true;
      }

      collection.set(key, updates.disposition, String(key), caller);

      return true;
    }
  }
}

class Descriptor {
  static from(descriptor: PropertyDescriptor) {
    return new Descriptor(descriptor);
  }

  static updates(
    object: object,
    key: PropertyKey,
    updates: PropertyDescriptor
  ) {
    return new Descriptor(
      updates,
      Reflect.getOwnPropertyDescriptor(object, key)
    );
  }

  #descriptor: PropertyDescriptor;
  #before: PropertyDescriptor | undefined;

  constructor(updates: PropertyDescriptor, before?: PropertyDescriptor) {
    this.#descriptor = updates;
    this.#before = before;
    this.#assert();
  }

  get disposition(): "key:stable" | "key:changes" {
    if (this.#before === undefined) {
      return "key:changes";
    }

    if (!Reflect.has(this.#descriptor, "enumerable")) {
      return "key:stable";
    }

    if (this.#descriptor.enumerable !== this.#before.enumerable) {
      return "key:changes";
    }

    return "key:stable";
  }

  get isNoop(): boolean {
    const before = this.#before;

    if (before === undefined) {
      return false;
    }

    const updates = this.#descriptor;

    if (
      Reflect.has(updates, "enumerable") &&
      updates.enumerable !== before.enumerable
    ) {
      return false;
    }

    if (isDataProperty(before) && isDataProperty(updates)) {
      if (
        Reflect.has(updates, "value") &&
        !Object.is(updates.value, before.value)
      ) {
        return false;
      }

      if (
        Reflect.has(updates, "writable") &&
        updates.writable !== before.writable
      ) {
        return false;
      }

      return true;
    }

    if (isAccessorProperty(before) && isAccessorProperty(updates)) {
      if (Reflect.has(updates, "get") && !Object.is(updates.get, before.get)) {
        return false;
      }

      if (Reflect.has(updates, "set") && !Object.is(updates.set, before.set)) {
        return false;
      }

      return true;
    }

    return false;
  }

  get value() {
    return this.#get("value");
  }

  get get() {
    return this.#get("get");
  }

  get set() {
    return this.#get("set");
  }

  get configurable() {
    return this.#attr("configurable");
  }

  get enumerable() {
    return this.#attr("enumerable");
  }

  get writable() {
    return this.#attr("writable");
  }

  #assert() {
    if (this.#get("configurable") === false) {
      throw TypeError(
        `reactive object don't support non-configurable properties yet`
      );
    }
  }

  get type() {
    if (this.#get("get")) {
      if (this.#get("set")) {
        return "accessor";
      } else {
        return "accessor:readonly";
      }
    }

    if (this.#get("set")) {
      return "accessor:writer";
    }

    const readonly = this.#attr("writable") ? "" : ":readonly";
    return `value${readonly}`;
  }

  #attr(key: "enumerable" | "configurable" | "writable") {
    return this.#get(key) ?? false;
  }

  #get<K extends keyof PropertyDescriptor>(
    key: K
  ): TypedPropertyDescriptor<unknown>[K] | void {
    if (Reflect.has(this.#descriptor, key)) {
      return Reflect.get(
        this.#descriptor,
        key
      ) as TypedPropertyDescriptor<unknown>[K];
    }

    if (!this.#before) {
      return;
    }

    if (Reflect.has(this.#before, key)) {
      return Reflect.get(
        this.#before,
        key
      ) as TypedPropertyDescriptor<unknown>[K];
    }
  }
}

interface DescriptorAttributes {
  configurable: boolean;
  enumerable: boolean;
}

interface DataProperty extends DescriptorAttributes {
  value: unknown;
  writable: boolean;
}

interface AccessorProperty extends DescriptorAttributes {
  get: () => unknown;
  set?: (value: unknown) => void;
}

function isDataProperty(
  descriptor: PropertyDescriptor
): descriptor is DataProperty {
  return !isAccessorProperty(descriptor);
}

function isAccessorProperty(
  descriptor: PropertyDescriptor
): descriptor is AccessorProperty {
  return "get" in descriptor || "set" in descriptor;
}

function member(prop: PropertyKey) {
  if (typeof prop === "symbol") {
    return `[${String(prop)}]`;
  } else {
    return `.${prop}`;
  }
}
