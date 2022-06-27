import type { DescriptionArgs } from "@starbeam/debug";
import { Tree } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";

import { LIFETIME } from "../../lifetime/api.js";
import type { DebugListener } from "../debug.js";
import { Queue } from "../queue.js";
import {
  type MutableInternals,
  type Reactive,
  type ReactiveInternals,
  type ReactiveProtocol,
  REACTIVE,
} from "../reactive.js";
// eslint-disable-next-line import/no-cycle
import { TIMELINE } from "../timeline.js";
import type { Timestamp } from "../timestamp.js";

export interface RenderableOperations {
  prune(renderable: Renderable<unknown>): void;
  poll<T>(renderable: Renderable<T>): T;
}
export interface DevInvalidated {
  readonly dependencies: MutableInternals[];
}

export interface DevDependencies<T> {
  readonly dependencies: MutableInternals[];
  readonly diff?: Diff<T>;
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
export class Renderable<T = unknown> implements ReactiveProtocol {
  static create<T>(
    input: Reactive<T>,
    notify: { readonly ready: (renderable: Renderable<T>) => void },
    operations: RenderableOperations,
    description: DescriptionArgs
  ): Renderable<T> {
    const initialDependencies = input[REACTIVE].children().dependencies;

    const renderable = new Renderable(
      input,
      notify,
      UNINITIALIZED,
      operations,
      description,
      new Set(initialDependencies),
      TIMELINE.now
    );

    LIFETIME.on.cleanup(renderable, () =>
      operations.prune(renderable as Renderable<unknown>)
    );

    return renderable;
  }

  static reactive<T>(renderable: Renderable<T>): Reactive<T> {
    return renderable.#input;
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
    if (!(renderable instanceof Renderable)) {
      console.log("renderable", renderable);
    }

    return renderable.#flush();
  }

  readonly #input: Reactive<T>;
  readonly #notify: { readonly ready: (renderable: Renderable<T>) => void };
  readonly #last: UNINITIALIZED | T;
  readonly #operations: RenderableOperations;
  readonly #description: DescriptionArgs;
  #dependencies: Set<MutableInternals>;

  // for debug purposes
  #lastChecked: Timestamp;

  private constructor(
    input: Reactive<T>,
    notify: { readonly ready: (renderable: Renderable<T>) => void },
    last: UNINITIALIZED | T,
    operations: RenderableOperations,
    description: DescriptionArgs,
    dependencies: Set<MutableInternals>,
    lastChecked: Timestamp
  ) {
    this.#input = input;
    this.#dependencies = dependencies;
    this.#last = last;
    this.#operations = operations;
    this.#description = description;
    this.#notify = notify;
    this.#lastChecked = lastChecked;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#input[REACTIVE];
  }

  poll(): T {
    return this.#operations.poll(this);
  }

  attach(notify: () => void): DebugListener {
    let last = TIMELINE.now;

    const listener = TIMELINE.attach(
      () => {
        if (this.#input[REACTIVE].isUpdatedSince(last)) {
          last = TIMELINE.now;
          notify();
        }
      },
      {
        filter: { type: "by-reactive", reactive: this.#input },
      }
    );

    LIFETIME.link(this, listener);

    // notify the listener for the first time so it can get set up properly, but do it after the
    // rest of the current render phase has finished.
    Queue.enqueueRender(notify);

    return listener;
  }

  debug({
    source,
    implementation = false,
  }: { source?: boolean; implementation?: boolean } = {}): string {
    const dependencies = [...this.#input[REACTIVE].children().dependencies];
    const descriptions = new Set(
      dependencies.map((dependency) => {
        return implementation
          ? dependency.description
          : dependency.description.userFacing();
      })
    );

    const nodes = [...descriptions].map((d) => {
      const description = implementation ? d : d.userFacing();
      return description.describe({ source });
    });

    return Tree(...nodes).format();
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
    this.#lastChecked = TIMELINE.now;

    const diffs: Diff<T> = {
      ...diff(prevDeps, nextDeps),
      values: { prev, next },
    };

    return diffs;
  }
}

export interface Diff<T> {
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
