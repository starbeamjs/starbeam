import type { UNINITIALIZED } from "@starbeam/peer";

import type { MutableInternals, Reactive } from "../reactive.js";
import { RenderableMap } from "./map.js";
// eslint-disable-next-line import/no-cycle
import { Renderable } from "./renderable.js";

export class Renderables {
  static create(): Renderables {
    return new Renderables(RenderableMap.empty(), new WeakMap());
  }

  readonly #internalsMap: RenderableMap;
  readonly #reactiveMap: WeakMap<Reactive<unknown>, Renderable>;

  private constructor(
    internals: RenderableMap,
    reactiveMap: WeakMap<Reactive<unknown>, Renderable>
  ) {
    this.#internalsMap = internals;
    this.#reactiveMap = reactiveMap;
  }

  isRemoved(renderable: Renderable<unknown>): boolean {
    return this.#internalsMap.isRemoved(renderable);
  }

  prune<T>(renderable: Renderable<T>) {
    this.#internalsMap.remove(renderable);
    // for (const [key, value] of this.#internalsMap) {
    //   if (value === renderable) {
    //     this.#internalsMap.delete(key);

    // const dependencies = Renderable.dependencies(renderable);

    // for (const dependency of dependencies) {
    //   this.#internalsMap.delete(dependency, renderable);
    // }
  }

  bumped(dependency: MutableInternals): void {
    for (const renderable of this.#internalsMap.get(dependency)) {
      Renderable.notifyReady(renderable);
    }
  }

  update<T>(reactive: Reactive<T>) {
    const renderable = this.#reactiveMap.get(reactive);

    if (renderable) {
      const { add, remove } = Renderable.updateDeps(renderable);

      for (const dep of add) {
        this.#internalsMap.insert(dep, renderable);
      }

      for (const dep of remove) {
        this.#internalsMap.delete(dep, renderable);
      }
    }
  }

  render<T>(
    renderable: Renderable<T>,
    changed: (next: T, prev: T | UNINITIALIZED) => void
  ): void {
    const {
      add,
      remove,
      values: { prev, next },
    } = Renderable.flush(renderable);

    if (prev !== next) {
      changed(next, prev);
    }

    for (const dep of add) {
      this.#internalsMap.insert(dep, renderable as Renderable<unknown>);
    }

    for (const dep of remove) {
      this.#internalsMap.delete(dep, renderable as Renderable<unknown>);
    }
  }

  insert(renderable: Renderable<unknown>) {
    this.#reactiveMap.set(Renderable.reactive(renderable), renderable);
    const dependencies = Renderable.dependencies(renderable);

    for (const dep of dependencies) {
      this.#internalsMap.insert(dep, renderable);
    }
  }
}
