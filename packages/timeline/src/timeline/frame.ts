import type {
  CompositeInternals,
  Description,
  MutableInternals,
  ReactiveId,
  Timestamp,
} from "@starbeam/interfaces";
import { REACTIVE, UNINITIALIZED } from "@starbeam/peer";
import { getID } from "./id.js";

import { ReactiveProtocol } from "./protocol.js";
import type { Timeline } from "./timeline.js";
import { now } from "./timestamp.js";

interface Marker {
  [REACTIVE]: Omit<MutableInternals, "lastUpdated"> & {
    lastUpdated: Timestamp;
  };
}

export class Frame<T = unknown>
  implements ReactiveProtocol<CompositeInternals>
{
  static create<T>(
    this: void,
    value: T,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp,
    description: Description
  ): Frame<T> {
    const id = getID();

    return new Frame(
      id,
      value,
      {
        [REACTIVE]: {
          type: "mutable",
          lastUpdated: finalized,
          description: description.key("initialized?").asImplementation(),
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
    const id = description.id;
    const initializedId = [id, getID()];

    return new Frame<T | UNINITIALIZED>(
      id,
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

  static update<T>(
    this: void,
    frame: Frame<T>,
    value: T,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp
  ): Frame<T> {
    return frame.#update(value, children, finalized);
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
    id: ReactiveId,
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

  get [REACTIVE](): CompositeInternals {
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

  #update<U>(
    this: Frame<U | UNINITIALIZED>,
    value: U,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp
  ): Frame<U>;
  #update(
    value: T,
    children: Set<ReactiveProtocol>,
    finalized: Timestamp
  ): Frame<T>;
  #update(
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
      Frame.update(frame, value, this.#children, now());
      timeline.update(frame);
    } else {
      frame = Frame.create(value, this.#children, now(), this.description);
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
