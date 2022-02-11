import {
  TrackedStorage,
  createStorage,
  getValue,
  setValue,
} from "./tracked-shim.js";
import type { Entries, EntriesToObject, Entry } from "./type-magic.js";

export default class TrackedObject {
  static fromEntries<E extends Entries>(entries: E): EntriesToObject<E>;
  static fromEntries(entries: readonly Entry[]): object;
  static fromEntries(entries: readonly Entry[]): object {
    return new TrackedObject(Object.fromEntries(entries));
  }

  constructor(obj: object = {}) {
    let proto = Object.getPrototypeOf(obj);
    let descs = Object.getOwnPropertyDescriptors(obj);

    let clone = Object.create(proto);

    for (let prop in descs) {
      Object.defineProperty(clone, prop, descs[prop]);
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;

    return new Proxy(clone, {
      get(target, prop, _receiver) {
        self.#readStorageFor(prop);

        return target[prop];
      },

      has(target, prop) {
        self.#readStorageFor(prop);

        return prop in target;
      },

      ownKeys(target) {
        getValue(self.#collection);

        return Reflect.ownKeys(target);
      },

      set(target, prop, value, _receiver) {
        target[prop] = value;

        self.#dirtyStorageFor(prop);
        setValue(self.#collection, null);

        return true;
      },

      getPrototypeOf() {
        return TrackedObject.prototype;
      },
    });
  }

  readonly #storages: Map<PropertyKey, TrackedStorage<unknown>> = new Map();
  readonly #collection = createStorage(null, () => false);

  #readStorageFor(key: PropertyKey): void {
    let storage = this.#storages.get(key);

    if (storage === undefined) {
      storage = createStorage(null, () => false);
      this.#storages.set(key, storage);
    }

    getValue(storage);
  }

  // @private
  #dirtyStorageFor(key: PropertyKey): void {
    const storage = this.#storages.get(key);

    if (storage) {
      setValue(storage, null);
    }
  }
}
