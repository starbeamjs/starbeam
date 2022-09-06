import type {
  CompositeInternals,
  Diff,
  Frame,
  MutableInternals,
  ReactiveInternals,
  ReactiveProtocol,
  Stack,
  Timestamp,
} from "@starbeam/interfaces";
import { REACTIVE } from "@starbeam/peer";
import { exhaustive } from "@starbeam/verify";

interface ReactiveProtocolStatics {
  dependencies(reactive: ReactiveProtocol): Iterable<MutableInternals>;
}

function reactiveInternals(reactive: ReactiveProtocol): ReactiveInternals {
  return reactive[REACTIVE];
}

interface OperationInfo<I extends ReactiveInternals> {
  readonly at: Timestamp;
  readonly for: I;
  readonly caller: Stack;
}

export type DebugOperationOptions =
  | CellConsumeOperation
  | CellUpdateOperation
  | FrameConsumeOperation;

export class LeafOperation<I extends ReactiveInternals> {
  #data: OperationInfo<I>;

  constructor(data: OperationInfo<I>) {
    this.#data = data;
  }

  get at(): Timestamp {
    return this.#data.at;
  }

  get for(): I {
    return this.#data.for;
  }

  get caller(): Stack {
    return this.#data.caller;
  }
}

export class CellConsumeOperation extends LeafOperation<MutableInternals> {
  readonly type = "cell:consume";
}

export class CellUpdateOperation extends LeafOperation<MutableInternals> {
  readonly type = "cell:update";
}

interface FrameConsumeInfo extends OperationInfo<CompositeInternals> {
  readonly diff: Diff<MutableInternals>;
  readonly frame: Frame;
}

export class FrameConsumeOperation extends LeafOperation<CompositeInternals> {
  readonly type = "frame:consume";
  readonly #diff: Diff<MutableInternals>;
  readonly #frame: Frame;

  constructor(data: FrameConsumeInfo) {
    super(data);
    this.#diff = data.diff;
    this.#frame = data.frame;
  }

  get diff(): Diff<MutableInternals> {
    return this.#diff;
  }

  get frame(): Frame {
    return this.#frame;
  }
}
export class MutationLog {
  readonly type = "mutation";
  // This makes `DebugOperation.for` ==== `ReactiveInternals | undefined`, which makes it possible
  // to easily compare the `for` value without a lot of extra type shenanigans.
  readonly for: ReactiveInternals | undefined = undefined;

  readonly #at: Timestamp;
  #description: string;
  #children: Set<DebugOperation> = new Set();
  #parent: MutationLog | null;

  constructor(at: Timestamp, description: string, parent: MutationLog | null) {
    this.#at = at;
    this.#description = description;
    this.#parent = parent;
  }

  get at(): Timestamp {
    return this.#at;
  }

  add(child: DebugOperation): void {
    this.#children.add(child);
  }
}

export type DebugOperation =
  | CellConsumeOperation
  | CellUpdateOperation
  | FrameConsumeOperation
  | MutationLog;

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
  filter: DebugFilter,
  reactive: ReactiveProtocolStatics
): ((operation: DebugOperation) => boolean) | undefined {
  switch (filter.type) {
    case "by-reactive": {
      const dependencies = reactive.dependencies(filter.reactive);
      // const dependencies = reactiveDependencies(filter.reactive).children()
      //   .dependencies;

      return (operation) => {
        if (operation.for === undefined) {
          return false;
        } else if (operation.for.type === "mutable") {
          // if the operation is for a dependency of the reactive we're
          // filtering by, then it's a match.
          return [...dependencies].includes(operation.for);
        } else {
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
  static create(
    timestamp: { now(): Timestamp },
    statics: ReactiveProtocolStatics
  ): DebugTimeline {
    return new DebugTimeline(timestamp, statics);
  }

  static Flush = class Flush {
    constructor(readonly history: DebugOperation[]) {}

    for(reactive: ReactiveProtocol): DebugOperation[] {
      const internals = reactiveInternals(reactive);
      return this.history.filter((item) => item.for === internals);
    }
  };

  static DebugListener = class DebugListener {
    static offset(this: void, listener: DebugListener): number {
      return listener.#offset;
    }

    static notify(this: void, listener: DebugListener): void {
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
    }

    update(filter: DebugFilter): void {
      this.#filter = filter;
    }

    flush(): DebugOperation[] {
      const flush = this.#timeline.#flush(
        this.#offset,
        filterToPredicate(this.#filter, this.#timeline.#statics)
      );
      this.#offset = this.#timeline.#end;
      this.#timeline.#prune();

      return flush.history;
    }

    detach(): void {
      this.#timeline.#listeners.delete(this);
    }
  };

  #timestamp: { now(): Timestamp };
  #statics: ReactiveProtocolStatics;
  #trimOffset = 0;
  #operationList: DebugOperation[] = [];
  #currentMutation: MutationLog | null = null;
  #listeners: Set<DebugListener> = new Set();

  private constructor(
    timestamp: { now(): Timestamp },
    statics: ReactiveProtocolStatics
  ) {
    this.#timestamp = timestamp;
    this.#statics = statics;
  }

  notify(): void {
    this.#listeners.forEach(DebugTimeline.DebugListener.notify);
  }

  get #end() {
    return this.#trimOffset + this.#operationList.length;
  }

  attach(
    notify: () => void,
    options: { filter: DebugFilter | "all" | "none" } = { filter: "all" }
  ): DebugListener {
    const filter: DebugFilter =
      typeof options.filter === "string"
        ? { type: options.filter }
        : options.filter;

    const listener = new DebugTimeline.DebugListener(this, notify, filter);
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

  consumeCell(internals: MutableInternals, caller: Stack): void {
    this.#consumeCell(internals, caller);
  }

  consumeFrame(
    frame: Frame,
    diff: Diff<MutableInternals>,
    caller: Stack
  ): void {
    this.#consumeFrame(frame, diff, caller);
  }

  #consumeCell(cell: MutableInternals, caller: Stack) {
    this.#add(
      new CellConsumeOperation({
        at: this.#timestamp.now(),
        for: cell,
        caller,
      })
    );
  }

  updateCell(cell: MutableInternals, caller: Stack): void {
    this.#add(
      new CellUpdateOperation({
        at: this.#timestamp.now(),
        for: cell,
        caller,
      })
    );
  }

  #consumeFrame(frame: Frame, diff: Diff<MutableInternals>, caller: Stack) {
    this.#add(
      new FrameConsumeOperation({
        at: this.#timestamp.now(),
        for: frame[REACTIVE],
        diff,
        caller,
        frame,
      })
    );
  }

  mutation<T>(description: string, callback: () => T): T {
    const prev = this.#currentMutation;
    const operation = new MutationLog(this.#timestamp.now(), description, prev);

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
