import type { MutableInternals, ReactiveProtocol } from "../reactive.js";
import { PollableMap } from "./map.js";
// eslint-disable-next-line import/no-cycle
import { Pollable } from "./pollable.js";

export class Pollables {
  static create(): Pollables {
    return new Pollables(PollableMap.empty(), new WeakMap());
  }

  readonly #internalsMap: PollableMap;
  readonly #reactiveMap: WeakMap<ReactiveProtocol, Pollable>;

  private constructor(
    internals: PollableMap,
    reactiveMap: WeakMap<ReactiveProtocol, Pollable>
  ) {
    this.#internalsMap = internals;
    this.#reactiveMap = reactiveMap;
  }

  isRemoved(renderable: Pollable): boolean {
    return this.#internalsMap.isRemoved(renderable);
  }

  prune(renderable: Pollable) {
    this.#internalsMap.remove(renderable);
  }

  bumped(dependency: MutableInternals): void {
    for (const pollable of this.#internalsMap.get(dependency)) {
      Pollable.notifyReady(pollable);
    }
  }

  update(reactive: ReactiveProtocol) {
    const pollable = this.#reactiveMap.get(reactive);

    if (pollable) {
      const { add, remove } = Pollable.updateDeps(pollable);

      for (const dep of add) {
        this.#internalsMap.insert(dep, pollable);
      }

      for (const dep of remove) {
        this.#internalsMap.delete(dep, pollable);
      }
    }
  }

  render(pollable: Pollable): void {
    const { add, remove } = Pollable.flush(pollable);

    for (const dep of add) {
      this.#internalsMap.insert(dep, pollable);
    }

    for (const dep of remove) {
      this.#internalsMap.delete(dep, pollable);
    }
  }

  insert(pollable: Pollable) {
    this.#reactiveMap.set(Pollable.reactive(pollable), pollable);
    const dependencies = Pollable.dependencies(pollable);

    for (const dep of dependencies) {
      this.#internalsMap.insert(dep, pollable);
    }
  }
}
