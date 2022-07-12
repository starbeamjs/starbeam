import type { DebugListener } from "@starbeam/debug";
import { Tree } from "@starbeam/debug";
import type { UNINITIALIZED } from "@starbeam/peer";
import { REACTIVE } from "@starbeam/peer";

import { LIFETIME } from "../../lifetime/api.js";
import { Queue } from "../queue.js";
import type {
  MutableInternals,
  ReactiveInternals,
  ReactiveProtocol,
} from "../reactive.js";
// eslint-disable-next-line import/no-cycle
import { TIMELINE } from "../timeline.js";
import type { Pollables } from "./pollables.js";

export interface DevInvalidated {
  readonly dependencies: MutableInternals[];
}

export interface DevDependencies<T> {
  readonly dependencies: MutableInternals[];
  readonly diff?: Diff<T>;
}

export class Pollable implements ReactiveProtocol {
  static create(
    input: ReactiveProtocol,
    notify: { readonly ready: (pollable: Pollable) => void },
    pollables: Pollables
  ): Pollable {
    const initialDependencies = input[REACTIVE].children().dependencies;

    const pollable = new Pollable(input, notify, new Set(initialDependencies));

    LIFETIME.on.cleanup(pollable, () => pollables.prune(pollable));

    return pollable;
  }

  static reactive(pollable: Pollable): ReactiveProtocol {
    return pollable.#input;
  }

  static dependencies(pollable: Pollable): Set<MutableInternals> {
    return pollable.#dependencies;
  }

  /**
   * The readiness notification is synchronous, but should be used to schedule a
   * flush at a later time.
   */
  static notifyReady(pollable: Pollable): void {
    pollable.#notify.ready(pollable);
  }

  static flush(pollable: Pollable): DependencyDiff {
    return pollable.#flush();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static updateDeps(pollable: Pollable): DependencyDiff {
    const prevDeps = pollable.#dependencies;
    const nextDeps = new Set(pollable.#input[REACTIVE].children().dependencies);

    pollable.#dependencies = nextDeps;

    return diff(prevDeps, nextDeps);
  }

  readonly #input: ReactiveProtocol;
  readonly #notify: {
    readonly ready: (pollable: Pollable) => void;
  };
  #dependencies: Set<MutableInternals>;

  private constructor(
    input: ReactiveProtocol,
    notify: { readonly ready: (pollable: Pollable) => void },
    dependencies: Set<MutableInternals>
  ) {
    this.#input = input;
    this.#dependencies = dependencies;
    this.#notify = notify;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#input[REACTIVE];
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
          : dependency.description.userFacing;
      })
    );

    const nodes = [...descriptions].map((d) => {
      const description = implementation ? d : d.userFacing;
      return description.describe({ source });
    });

    return Tree(...nodes).format();
  }

  #flush(): DependencyDiff {
    const prevDeps = this.#dependencies;
    const nextDeps = new Set(this.#input[REACTIVE].children().dependencies);

    this.#dependencies = nextDeps;

    return diff(prevDeps, nextDeps);
  }
}

export interface DependencyDiff {
  readonly add: Set<MutableInternals>;
  readonly remove: Set<MutableInternals>;
}

export interface Diff<T> extends DependencyDiff {
  readonly values: {
    readonly prev: T | UNINITIALIZED;
    readonly next: T;
  };
}

function diff(
  prev: Set<MutableInternals>,
  next: Set<MutableInternals>
): DependencyDiff {
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
