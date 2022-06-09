import { exhaustive } from "@starbeam/verify";

import { LIFETIME } from "../lifetime/api.js";
import {
  type CompositeInternals,
  type MutableInternals,
  type ReactiveInternals,
  type ReactiveProtocol,
  REACTIVE,
} from "./reactive.js";
import type { Timestamp } from "./timestamp.js";

// TODO: Make this a build time concern
let DEBUG = true;

export function isDebug() {
  return DEBUG;
}

export function setDebug(value: boolean) {
  DEBUG = value;
}

abstract class AbstractDebugOperation {
  #at: Timestamp;
  abstract readonly for: ReactiveInternals | undefined;

  constructor(at: Timestamp) {
    this.#at = at;
  }
}

abstract class InternalsOperation extends AbstractDebugOperation {
  readonly for: ReactiveInternals;

  constructor(at: Timestamp, internals: ReactiveInternals) {
    super(at);
    this.for = internals;
  }
}

class ConsumeCell extends InternalsOperation {
  readonly type = "cell:consume";
}
class ConsumeFrame extends InternalsOperation {
  readonly type = "frame:consume";
}
class UpdateCell extends InternalsOperation {
  readonly type = "cell:update";
}

class Mutation extends AbstractDebugOperation {
  readonly type = "mutation";

  #description: string;
  #children: Set<DebugOperation> = new Set();
  #parent: Mutation | null;

  readonly for = undefined;

  constructor(at: Timestamp, description: string, parent: Mutation | null) {
    super(at);
    this.#description = description;
    this.#parent = parent;
  }

  add(child: DebugOperation) {
    this.#children.add(child);
  }
}

export type DebugOperation = ConsumeCell | ConsumeFrame | UpdateCell | Mutation;

export interface Flush {
  readonly history: DebugOperation[];
  for(reactive: ReactiveProtocol): readonly DebugOperation[];
}

export type DebugListener = InstanceType<typeof DebugTimeline.DebugListener>;

export type DebugFilter =
  | { type: "by-reactive"; reactive: ReactiveProtocol }
  | { type: "all" }
  | { type: "none" };

function filterToPredicate(
  filter: DebugFilter
): ((operation: DebugOperation) => boolean) | undefined {
  switch (filter.type) {
    case "by-reactive": {
      const dependencies = filter.reactive[REACTIVE].children().dependencies;

      return (operation) => {
        if (operation.for === undefined) {
          return false;
        } else {
          // if the operation is for the reactive we're filtering by,
          // then it's a match.
          if (operation.for === filter.reactive) {
            return true;
          }

          // if the operation is for a dependency of the reactive we're
          // filtering by, then it's a match.
          if (operation.for.type === "mutable") {
            return dependencies.has(operation.for);
          }

          return false;
        }
      };
    }
    case "all":
      return;
    case "none":
      return () => false;
    default:
      exhaustive(filter);
  }
}

export class DebugTimeline {
  static create(updatedAt: Timestamp): DebugTimeline {
    return new DebugTimeline(updatedAt);
  }

  static Flush = class Flush {
    constructor(readonly history: DebugOperation[]) {}

    for(reactive: ReactiveProtocol) {
      const internals = reactive[REACTIVE];
      return this.history.filter((item) => item.for === internals);
    }
  };

  static DebugListener = class DebugListener {
    static offset(this: void, listener: DebugListener) {
      return listener.#offset;
    }

    static notify(this: void, listener: DebugListener) {
      listener.#notify();
    }

    #timeline: DebugTimeline;
    #offset = 0;
    #filter: DebugFilter;
    #notify: () => void;

    constructor(
      timeline: DebugTimeline,
      notify: () => void,
      filter: DebugFilter
    ) {
      this.#timeline = timeline;
      this.#notify = notify;
      this.#filter = filter;

      LIFETIME.on.cleanup(this, () => this.detach());
    }

    update(filter: DebugFilter) {
      this.#filter = filter;
    }

    flush(): DebugOperation[] {
      const flush = this.#timeline.#flush(
        this.#offset,
        filterToPredicate(this.#filter)
      );
      this.#offset = this.#timeline.#end;
      this.#timeline.#prune();

      return flush.history;
    }

    detach() {
      this.#timeline.#listeners.delete(this);
    }
  };

  #lastUpdate: Timestamp;
  #trimOffset = 0;
  #operationList: DebugOperation[] = [];
  #currentMutation: Mutation | null = null;
  #listeners: Set<DebugListener> = new Set();

  private constructor(lastUpdate: Timestamp) {
    this.#lastUpdate = lastUpdate;
  }

  notify() {
    this.#listeners.forEach(DebugTimeline.DebugListener.notify);
  }

  get #end() {
    return this.#trimOffset + this.#operationList.length;
  }

  attach(notify: () => void, options: { filter: DebugFilter }): DebugListener {
    const listener = new DebugTimeline.DebugListener(
      this,
      notify,
      options.filter
    );
    this.#listeners.add(listener);

    return listener;
  }

  #flush(
    offset: number,
    filter?: (operation: DebugOperation) => boolean
  ): Flush {
    let list = this.#operationList.slice(offset - this.#trimOffset);

    if (filter) {
      list = list.filter(filter);
    }

    return new DebugTimeline.Flush(list);
  }

  #prune() {
    const minOffset = Math.min(
      ...[...this.#listeners].map(DebugTimeline.DebugListener.offset)
    );

    const trim = minOffset - this.#trimOffset;
    this.#operationList = this.#operationList.slice(trim);
    this.#trimOffset = minOffset;
  }

  #add(operation: DebugOperation) {
    if (this.#currentMutation) {
      this.#currentMutation.add(operation);
    } else {
      this.#operationList.push(operation);
    }
  }

  consume(reactive: ReactiveProtocol) {
    const internals = reactive[REACTIVE];

    if (internals.type === "mutable") {
      this.#consumeCell(internals);
    } else if (internals.type === "composite") {
      this.#consumeFrame(internals);
    }
  }

  #consumeCell(cell: MutableInternals) {
    this.#add(new ConsumeCell(this.#lastUpdate, cell));
  }

  updateCell(cell: MutableInternals) {
    this.#add(new UpdateCell(this.#lastUpdate, cell));
  }

  #consumeFrame(frame: CompositeInternals) {
    this.#add(new ConsumeFrame(this.#lastUpdate, frame));
  }

  mutation<T>(description: string, callback: () => T): T {
    const prev = this.#currentMutation;
    const operation = new Mutation(this.#lastUpdate, description, prev);

    try {
      this.#currentMutation = operation;
      const ret = callback();
      this.#currentMutation = prev;
      this.#add(operation);

      return ret;
    } catch (e) {
      this.#currentMutation = prev;
      throw e;
    }
  }
}
