import type { MutableInternals } from "../reactive.js";
import type { Pollable } from "./pollable.js";

export class PollableMap {
  static empty(): PollableMap {
    return new PollableMap(new WeakMap(), new WeakSet());
  }

  #map: WeakMap<MutableInternals, Set<Pollable>>;
  #removed: WeakSet<Pollable>;

  constructor(
    map: WeakMap<MutableInternals, Set<Pollable>>,
    removed: WeakSet<Pollable>
  ) {
    this.#map = map;
    this.#removed = removed;
  }

  remove(pollable: Pollable): void {
    this.#removed.add(pollable);
  }

  isRemoved(pollable: Pollable): boolean {
    return this.#removed.has(pollable);
  }

  delete(dependency: MutableInternals, pollable: Pollable): void {
    const set = this.#map.get(dependency);
    if (set) {
      set.delete(pollable);
    }
  }

  *get(dependency: MutableInternals): Iterable<Pollable> {
    const pollables = this.#map.get(dependency);

    if (pollables) {
      for (const pollable of pollables) {
        if (this.#removed.has(pollable)) {
          pollables.delete(pollable);
        } else {
          yield pollable;
        }
      }
    }
  }

  insert(dependency: MutableInternals, pollable: Pollable): void {
    let set = this.#map.get(dependency);
    if (!set) {
      set = new Set();
      this.#map.set(dependency, set);
    }
    set.add(pollable);
  }
}
