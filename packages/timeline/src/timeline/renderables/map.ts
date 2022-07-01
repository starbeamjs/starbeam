import type { MutableInternals } from "../reactive.js";
import type { Renderable } from "./renderable.js";

export class RenderableMap {
  static empty(): RenderableMap {
    return new RenderableMap(new WeakMap(), new WeakSet());
  }

  #map: WeakMap<MutableInternals, Set<Renderable>>;
  #removed: WeakSet<Renderable>;

  constructor(
    map: WeakMap<MutableInternals, Set<Renderable>>,
    removed: WeakSet<Renderable>
  ) {
    this.#map = map;
    this.#removed = removed;
  }

  remove(renderable: Renderable): void {
    this.#removed.add(renderable);
  }

  isRemoved(renderable: Renderable): boolean {
    return this.#removed.has(renderable);
  }

  delete(dependency: MutableInternals, renderable: Renderable): void {
    const set = this.#map.get(dependency);
    if (set) {
      set.delete(renderable);
    }
  }

  *get(dependency: MutableInternals): Iterable<Renderable> {
    const renderables = this.#map.get(dependency);

    if (renderables) {
      for (const renderable of renderables) {
        if (this.#removed.has(renderable)) {
          renderables.delete(renderable);
        } else {
          yield renderable;
        }
      }
    }
  }

  insert(dependency: MutableInternals, renderable: Renderable): void {
    let set = this.#map.get(dependency);
    if (!set) {
      set = new Set();
      this.#map.set(dependency, set);
    }
    set.add(renderable);
  }
}
