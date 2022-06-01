import { Stack } from "@starbeam/debug";

import { Collection } from "./collection.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnsafeIndex = any;

export default class TrackedObject {
  constructor(obj: object = {}) {
    const target = { ...obj };
    const collection = Collection.create<PropertyKey>(
      `TrackedObject @ ${Stack.describeCaller()}`
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return new Proxy(target, {
      get(target, prop, _receiver) {
        collection.get(prop, prop in target ? "hit" : "miss");
        // eslint-disable-next-line
        return (target as UnsafeIndex)[prop];
      },

      has(target, prop) {
        const hit = prop in target;
        collection.check(prop, hit ? "hit" : "miss");
        return hit;
      },

      ownKeys(target) {
        collection.iterate();
        return Reflect.ownKeys(target);
      },

      getOwnPropertyDescriptor(target, prop) {
        collection.get(prop, prop in target ? "hit" : "miss");
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },

      set(target, prop, value, _receiver) {
        // eslint-disable-next-line
        const current = (target as UnsafeIndex)[prop];

        if (Object.is(current, value)) {
          return true;
        }

        if (!(prop in target)) {
          collection.splice();
        }

        collection.set(prop);

        // eslint-disable-next-line
        (target as UnsafeIndex)[prop] = value;

        return true;
      },

      deleteProperty(target, prop) {
        if (!(prop in target)) {
          return true;
        }

        collection.splice();
        collection.delete(prop);

        // eslint-disable-next-line
        delete (target as UnsafeIndex)[prop];

        return true;
      },

      getPrototypeOf() {
        return TrackedObject.prototype;
      },
    }) as any;
  }
}
