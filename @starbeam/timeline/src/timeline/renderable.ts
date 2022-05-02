import { UNINITIALIZED } from "@starbeam/fundamental";
import { WeakMapOfSet } from "@starbeam/utils";
import { LIFETIME } from "../lifetime.js";
import type { MutableInternals } from "./internals.js";
import { REACTIVE, type Reactive } from "./reactive.js";
import { TIMELINE } from "./timeline.js";

export class Renderables {
  static create(): Renderables {
    return new Renderables(WeakMapOfSet());
  }

  readonly #internalsMap: WeakMapOfSet<MutableInternals, Renderable<unknown>>;

  private constructor(
    internals: WeakMapOfSet<MutableInternals, Renderable<unknown>>
  ) {
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

/**
 * A {@link Renderable} associates a {@link Reactive} object with a render
 * phase.
 *
 * A {@link Renderable} can be polled through the {@link Timeline}, and its
 * render phase will run at that time.
 *
 * `Renderable`s have no value. Their entire purpose is to reflect some
 * `Reactive` object onto an external output. You should use a normal formula or
 * resource if you are trying to compute a value from other values.
 */
export class Renderable<T> {
  static create<T>(
    input: Reactive<T>,
    notify: { readonly ready: (renderable: Renderable<T>) => void },
    description: string
  ): Renderable<T> {
    const initialDependencies = input[REACTIVE].children().dependencies;
    const renderable = new Renderable(
      input,
      notify,
      UNINITIALIZED,
      new Set(initialDependencies),
      description
    );

    LIFETIME.on.finalize(renderable, () =>
      TIMELINE.prune(renderable as Renderable<unknown>)
    );

    return renderable;
  }

  static dependencies(renderable: Renderable<unknown>): Set<MutableInternals> {
    return renderable.#dependencies;
  }

  /**
   * The readiness notification is synchronous, but should be used to schedule a
   * flush at a later time.
   */
  static notifyReady(renderable: Renderable<unknown>): void {
    renderable.#notify.ready(renderable);
  }

  static flush<T>(renderable: Renderable<T>): Diff<T> {
    return renderable.#flush();
  }

  readonly #input: Reactive<T>;
  readonly #notify: { readonly ready: (renderable: Renderable<T>) => void };
  readonly #last: UNINITIALIZED | T;
  #dependencies: Set<MutableInternals>;
  readonly #description: string;

  private constructor(
    input: Reactive<T>,
    notify: { readonly ready: (renderable: Renderable<T>) => void },
    last: UNINITIALIZED | T,
    dependencies: Set<MutableInternals>,
    description: string
  ) {
    this.#input = input;
    this.#dependencies = dependencies;
    this.#last = last;
    this.#notify = notify;
    this.#description = description;
  }

  poll(): T {
    return TIMELINE.poll(this);
  }

  render():
    | { status: "changed"; prev: T; value: T }
    | { status: "unchanged"; value: T }
    | { status: "initialized"; value: T } {
    const {
      values: { prev, next },
      add,
      remove,
    } = this.#flush();

    if (prev === UNINITIALIZED) {
      return { status: "initialized", value: next };
    } else if (prev === next) {
      return { status: "unchanged", value: next };
    } else {
      return { status: "changed", prev, value: next };
    }
  }

  #flush(): Diff<T> {
    const prev = this.#last;
    const next = this.#input.current;

    const prevDeps = this.#dependencies;
    const nextDeps = new Set(this.#input[REACTIVE].children().dependencies);

    this.#dependencies = nextDeps;

    return { ...diff(prevDeps, nextDeps), values: { prev, next } };
  }
}

interface Diff<T> {
  readonly values: {
    readonly prev: T | UNINITIALIZED;
    readonly next: T;
  };
  readonly add: Set<MutableInternals>;
  readonly remove: Set<MutableInternals>;
}

function diff(prev: Set<MutableInternals>, next: Set<MutableInternals>) {
  const add = new Set<MutableInternals>();
  const remove = new Set<MutableInternals>();

  for (const internal of prev) {
    if (!next.has(internal)) {
      remove.add(internal);
    }
  }

  for (const internal of next) {
    if (!prev.has(internal)) {
      add.add(internal);
    }
  }

  return { add, remove };
}
