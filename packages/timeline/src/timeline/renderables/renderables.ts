import type { UNINITIALIZED } from "@starbeam/peer";

import type { MutableInternals } from "../reactive.js";
import { RenderableMap } from "./map.js";
// eslint-disable-next-line import/no-cycle
import { type RenderableOperations, Renderable } from "./renderable.js";

export class Renderables implements RenderableOperations {
  static create(): Renderables {
    return new Renderables(RenderableMap.empty());
  }

  readonly #internalsMap: RenderableMap;

  private constructor(internals: RenderableMap) {
    this.#internalsMap = internals;
  }

  prune(renderable: Renderable<unknown>) {
    const dependencies = Renderable.dependencies(renderable);

    for (const dependency of dependencies) {
      this.#internalsMap.delete(dependency, renderable);
    }
  }

  bumped(dependency: MutableInternals): void {
    const renderables = this.#internalsMap.get(dependency);

    if (renderables) {
      for (const renderable of renderables) {
        Renderable.notifyReady(renderable);
      }
    }
  }

  poll<T>(renderable: Renderable<T>): T {
    const {
      add,
      remove,
      values: { next },
    } = Renderable.flush(renderable);

    for (const dep of add) {
      this.#internalsMap.insert(dep, renderable as Renderable<unknown>);
    }

    for (const dep of remove) {
      this.#internalsMap.delete(dep, renderable as Renderable<unknown>);
    }

    return next;
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
    const dependencies = Renderable.dependencies(renderable);

    for (const dep of dependencies) {
      this.#internalsMap.insert(dep, renderable);
    }
  }
}
