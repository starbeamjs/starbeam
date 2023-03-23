import type {
  CellCore,
  Description,
  FormulaCore,
  Frame as IFrame,
  Timestamp,
} from "@starbeam/interfaces";
import { REACTIVE, UNINITIALIZED } from "@starbeam/shared";
import { isNotEqual, verified } from "@starbeam/verify";

import type { FrameStack } from "./frames.js";
import { getID } from "./id.js";
import { SubscriptionTarget } from "./protocol.js";
import type { Timeline } from "./timeline.js";
import { getNow } from "./timestamp.js";

interface Marker {
  [REACTIVE]: Omit<CellCore, "lastUpdated"> & {
    lastUpdated: Timestamp;
  };
}

export class Frame<T = unknown>
  implements SubscriptionTarget<FormulaCore>, IFrame
{
  static create<T>(
    this: void,
    value: T,
    children: Set<SubscriptionTarget>,
    finalized: Timestamp,
    description: Description
  ): Frame<T> {
    const id = getID();

    return new Frame(
      value,
      {
        [REACTIVE]: {
          type: "mutable",
          lastUpdated: finalized,
          description: description
            .key("initialized?", { id })
            .asImplementation(),
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
  ): Frame<T> {
    const id = description.id;

    return new Frame<T>(
      UNINITIALIZED,
      {
        [REACTIVE]: {
          type: "mutable",
          lastUpdated: finalized,
          description: description.detail("initialized?", { id }),
        },
      },
      new Set(),
      finalized,
      description
    );
  }

  static value<T>(this: void, frame: Frame<T>): T {
    return verified(frame.#value, isNotEqual(UNINITIALIZED));
  }

  static isInitialized(this: void, frame: Frame): boolean {
    return frame.#value !== UNINITIALIZED;
  }

  static update<T>(
    this: void,
    frame: Frame<T>,
    value: T,
    children: Set<SubscriptionTarget>,
    finalized: Timestamp
  ): Frame<T> {
    return frame.#update(value, children, finalized);
  }

  static updateChildren<T>(
    this: void,
    frame: Frame<T>,
    children: Set<SubscriptionTarget>
  ): void {
    frame.#children = children;
  }

  #value: T | UNINITIALIZED;
  readonly #initialized: Marker;
  #children: ReadonlySet<SubscriptionTarget>;
  #finalized: Timestamp;
  readonly #description: Description;

  constructor(
    value: T | UNINITIALIZED,
    initialized: {
      [REACTIVE]: Omit<CellCore, "lastUpdated"> & {
        lastUpdated: Timestamp;
      };
    },
    children: Set<SubscriptionTarget>,
    finalized: Timestamp,
    description: Description
  ) {
    this.#value = value;
    this.#initialized = initialized;
    this.#children = children;
    this.#finalized = finalized;
    this.#description = description;
  }

  get [REACTIVE](): FormulaCore {
    return {
      type: "composite",
      description: this.#description,
      children: (): SubscriptionTarget[] => {
        return [this.#initialized, ...this.#children];
      },
    };
  }

  get description(): Description {
    return this.#description;
  }

  evaluate(block: () => T, stack: FrameStack): Frame<T> {
    const activeFrame = stack.start(this);

    try {
      stack.willEvaluate();
      const result = block();
      const frame = stack.end(activeFrame, result);
      stack.updateSubscriptions(frame);
      return frame;
    } catch (e) {
      stack.finally(activeFrame);
      throw e;
    }
  }

  #update(
    value: T,
    children: Set<SubscriptionTarget>,
    finalized: Timestamp
  ): this {
    if (Object.is(this.#value, UNINITIALIZED)) {
      this.#initialized[REACTIVE].lastUpdated = finalized;
    }

    this.#value = value;
    this.#children = children;
    this.#finalized = finalized;
    return this;
  }

  validate(): FrameValidation<Exclude<T, UNINITIALIZED>> {
    if (
      this.#value === UNINITIALIZED ||
      SubscriptionTarget.lastUpdatedIn([...this.#children]).gt(this.#finalized)
    ) {
      return { status: "invalid" };
    } else {
      return {
        status: "valid",
        value: this.#value as Exclude<T, UNINITIALIZED>,
      };
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
  readonly #children: Set<SubscriptionTarget>;

  private constructor(
    updating: Frame<T> | null,
    prev: ActiveFrame<T> | null,
    children: Set<SubscriptionTarget>,
    readonly description: Description
  ) {
    this.#updating = updating;
    this.#prev = prev;
    this.#children = children;
  }

  add(child: SubscriptionTarget): void {
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
      Frame.update(frame, value, this.#children, getNow());
      timeline.update(frame);
    } else {
      frame = Frame.create(value, this.#children, getNow(), this.description);
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
