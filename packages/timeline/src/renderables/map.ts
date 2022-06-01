import type { MutableInternals } from "../timeline/reactive.js";
import type { Renderable } from "./renderable.js";

export class RenderableMap {
  static empty(): RenderableMap {
    return new RenderableMap(new WeakMap());
  }

  #map: WeakMap<MutableInternals, Set<Renderable>>;

  constructor(map: WeakMap<MutableInternals, Set<Renderable>>) {
    this.#map = map;
  }

  delete(dependency: MutableInternals, renderable: Renderable): void {
    const set = this.#map.get(dependency);
    if (set) {
      set.delete(renderable);
    }
  }

  get(dependency: MutableInternals): Set<Renderable> | undefined {
    return this.#map.get(dependency);
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
