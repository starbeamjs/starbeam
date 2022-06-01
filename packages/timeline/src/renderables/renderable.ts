import { UNINITIALIZED } from "@starbeam/peer";

import { LIFETIME } from "../lifetime/api.js";
import {
  type MutableInternals,
  type Reactive,
  REACTIVE,
} from "../timeline/reactive.js";

interface RenderableOperations {
  prune(renderable: Renderable<unknown>): void;
  poll<T>(renderable: Renderable<T>): T;
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
export class Renderable<T = unknown> {
  static create<T>(
    input: Reactive<T>,
    notify: { readonly ready: (renderable: Renderable<T>) => void },
    operations: RenderableOperations,
    description: string
  ): Renderable<T> {
    const initialDependencies = input[REACTIVE].children().dependencies;
    const renderable = new Renderable(
      input,
      notify,
      UNINITIALIZED,
      operations,
      new Set(initialDependencies),
      description
    );

    LIFETIME.on.cleanup(renderable, () =>
      operations.prune(renderable as Renderable<unknown>)
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
  readonly #operations: RenderableOperations;
  #dependencies: Set<MutableInternals>;
  readonly #description: string;

  private constructor(
    input: Reactive<T>,
    notify: { readonly ready: (renderable: Renderable<T>) => void },
    last: UNINITIALIZED | T,
    operations: RenderableOperations,
    dependencies: Set<MutableInternals>,
    description: string
  ) {
    this.#input = input;
    this.#dependencies = dependencies;
    this.#last = last;
    this.#operations = operations;
    this.#notify = notify;
    this.#description = description;
  }

  poll(): T {
    return this.#operations.poll(this);
  }

  render():
    | { status: "changed"; prev: T; value: T }
    | { status: "unchanged"; value: T }
    | { status: "initialized"; value: T } {
    const {
      values: { prev, next },
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
