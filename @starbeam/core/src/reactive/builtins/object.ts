import type { Marker } from "@starbeam/reactive";
import { COORDINATOR } from "@starbeam/schedule";
import { consume, createMarker, mark } from "./tracked-shim.js";
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
    const self = this;

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
        consume(self.#marker);

        return Reflect.ownKeys(target);
      },

      set(target, prop, value, _receiver) {
        target[prop] = value;

        const tx = COORDINATOR.begin(
          `setting ${String(prop)} on a reactive object`
        );

        self.#dirtyStorageFor(prop);
        mark(self.#marker);

        tx.commit();

        return true;
      },

      getPrototypeOf() {
        return TrackedObject.prototype;
      },
    });
  }

  readonly #markersByKey: Map<PropertyKey, Marker> = new Map();
  readonly #marker: Marker = createMarker();

  #initializeStorageFor(key: PropertyKey): Marker {
    const markers = this.#markersByKey;
    let marker = markers.get(key);

    if (marker === undefined) {
      marker = createMarker(
        `TrackedObject${typeof key === "symbol" ? `[${key.description}]` : key}`
      );
      this.#markersByKey.set(key, marker);
    }

    return marker;
  }

  #readStorageFor(key: PropertyKey): void {
    const marker = this.#initializeStorageFor(key);

    consume(marker);
  }

  // @private
  #dirtyStorageFor(key: PropertyKey): void {
    const marker = this.#markersByKey.get(key);

    if (marker) {
      mark(marker);
    }
  }
}
