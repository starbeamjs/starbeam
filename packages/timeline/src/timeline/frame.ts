import type { Description } from "@starbeam/debug";
import { REACTIVE, UNINITIALIZED } from "@starbeam/peer";

import type { MutableInternals, ReactiveInternals } from "./protocol.js";
import { ReactiveProtocol } from "./protocol.js";
import type { Timeline } from "./timeline.js";
import { Timestamp } from "./timestamp.js";

interface Marker {
  [REACTIVE]: Omit<MutableInternals, "lastUpdated"> & {
    lastUpdated: Timestamp;
  };
}

export class Frame<T = unknown> implements ReactiveProtocol {
  static create<T>(
    this: void,
    value: T,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp,
    description: Description
  ): Frame<T> {
    return new Frame(
      value,
      {
        [REACTIVE]: {
          type: "mutable",
          lastUpdated: finalized,
          description: description
            .key("initialized?")
            .implementation({ userFacing: description }),
        },
      },
      children,
      finalized,
      description
    );
  }

  static uninitialized<T>(
    finalized: Timestamp,
    description: Description
  ): Frame<T | UNINITIALIZED> {
    return new Frame<T | UNINITIALIZED>(
      UNINITIALIZED,
      {
        [REACTIVE]: {
          type: "mutable",
          lastUpdated: finalized,
          description: description.detail("initialized?"),
        },
      },
      new Set(),
      finalized,
      description
    );
  }

  static value<T>(this: void, frame: Frame<T>): T {
    return frame.#value;
  }

  static updateChildren<T>(
    this: void,
    frame: Frame<T>,
    children: Set<ReactiveProtocol>
  ): void {
    frame.#children = children;
  }

  #value: T;
  #initialized: Marker;
  #children: ReadonlySet<ReactiveProtocol>;
  #finalized: Timestamp;
  #description: Description;

  constructor(
    value: T,
    initialized: {
      [REACTIVE]: Omit<MutableInternals, "lastUpdated"> & {
        lastUpdated: Timestamp;
      };
    },
    children: Set<ReactiveProtocol>,
    finalized: Timestamp,
    description: Description
  ) {
    this.#value = value;
    this.#initialized = initialized;
    this.#children = children;
    this.#finalized = finalized;
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    return {
      type: "composite",
      description: this.#description,
      children: () => {
        return [this.#initialized, ...this.#children];
      },
    };
  }

  get description(): Description {
    return this.#description;
  }

  update<U>(
    this: Frame<U | UNINITIALIZED>,
    value: U,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp
  ): Frame<U>;
  update(
    value: T,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp
  ): Frame<T>;
  update(
    value: T,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp
  ): Frame<T> {
    if (Object.is(this.#value, UNINITIALIZED)) {
      this.#initialized[REACTIVE].lastUpdated = finalized;
    }

    this.#value = value;
    this.#children = children;
    this.#finalized = finalized;
    return this;
  }

  validate<U>(this: Frame<U | UNINITIALIZED>): FrameValidation<U> {
    if (
      Object.is(this.#value, UNINITIALIZED) ||
      ReactiveProtocol.lastUpdatedIn([...this.#children]).gt(this.#finalized)
    ) {
      return { status: "invalid" };
    } else {
      return { status: "valid", value: this.#value as U };
    }
  }
}

export class ActiveFrame<T> {
  static create<T>(
    updating: Frame<T> | null,
    prev: ActiveFrame<T> | null,
    description: Description
  ): ActiveFrame<T> {
    return new ActiveFrame(updating, prev, new Set(), description);
  }

  readonly #updating: Frame<T> | null;
  readonly #prev: ActiveFrame<unknown> | null;
  readonly #children: Set<ReactiveProtocol>;

  private constructor(
    updating: Frame<T> | null,
    prev: ActiveFrame<T> | null,
    children: Set<ReactiveProtocol>,
    readonly description: Description
  ) {
    this.#updating = updating;
    this.#prev = prev;
    this.#children = children;
  }

  add(child: ReactiveProtocol): void {
    this.#children.add(child);
  }

  finally(): { prev: ActiveFrame<unknown> | null } {
    return { prev: this.#prev };
  }

  finalize(
    value: T,
    timeline: Timeline
  ): { prev: ActiveFrame<unknown> | null; frame: Frame<T> } {
    let frame = this.#updating;

    if (frame) {
      frame.update(value, this.#children, Timestamp.now());
      timeline.update(frame);
    } else {
      frame = Frame.create(
        value,
        this.#children,
        Timestamp.now(),
        this.description
      );
    }

    return { prev: this.#prev, frame };
  }
}

export interface ValidFrame<T> {
  readonly status: "valid";
  readonly value: T;
}

export interface InvalidFrame {
  readonly status: "invalid";
}

export type FrameValidation<T> = ValidFrame<T> | InvalidFrame;
