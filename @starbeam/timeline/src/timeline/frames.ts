import { LOGGER } from "@starbeam/trace-internals";
import type { IsUpdatedSince, MutableInternals } from "./internals.js";
import type { Timestamp } from "./timestamp.js";

export class AssertFrame {
  static describing(description: string): AssertFrame {
    return new AssertFrame(description);
  }

  readonly #description: string;

  private constructor(description: string) {
    this.#description = description;
  }

  assert(): void {
    throw Error(
      `The current timestamp should not change while ${this.#description}`
    );
  }
}

export type FrameChild = MutableInternals | FinalizedFrame;

export const FrameChild = {
  isFrame: (child: FrameChild): child is FinalizedFrame => {
    return child instanceof FinalizedFrame;
  },

  isLeaf: (child: FrameChild): child is MutableInternals => {
    return !FrameChild.isFrame(child);
  },
} as const;

export class ActiveFrame {
  static create(description: string): ActiveFrame {
    return new ActiveFrame(new Set(), description);
  }

  readonly #storages: Set<FrameChild>;

  private constructor(cells: Set<FrameChild>, readonly description: string) {
    this.#storages = cells;
  }

  add(storage: FrameChild): void {
    this.#storages.add(storage);
  }

  finalize<T>(
    value: T,
    now: Timestamp
  ): { readonly frame: FinalizedFrame<T>; readonly value: T } {
    return {
      frame: FinalizedFrame.create({
        children: this.#storages,
        finalizedAt: now,
        value,
        description: this.description,
      }),
      value,
    };
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

export class FinalizedFrame<T = unknown> implements IsUpdatedSince {
  static create<T>({
    children,
    finalizedAt,
    value,
    description,
  }: {
    children: Set<FrameChild>;
    finalizedAt: Timestamp;
    value: T;
    description: string;
  }): FinalizedFrame<T> {
    return new FinalizedFrame(children, finalizedAt, value, description);
  }

  readonly #children: Set<FrameChild>;
  readonly #finalizedAt: Timestamp;
  readonly #value: T;

  private constructor(
    children: Set<FrameChild>,
    finalizedAt: Timestamp,
    value: T,
    readonly description: string
  ) {
    this.#children = children;
    this.#finalizedAt = finalizedAt;
    this.#value = value;
  }

  get children(): Set<FrameChild> {
    return this.#children;
  }

  // TODO: Merge with ReactiveInternals.currentDependencies
  get dependencies(): readonly MutableInternals[] {
    return [...this.#children].flatMap((child) =>
      FrameChild.isFrame(child) ? child.#leaves : child
    );
  }

  get #leaves(): readonly MutableInternals[] {
    return [...this.#children].flatMap((child) => {
      if (child instanceof FinalizedFrame) {
        return child.#leaves;
      } else if (child.isFrozen()) {
        return [];
      } else {
        return [child];
      }
    });
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    let isUpdated = false;

    for (let child of this.#children) {
      if (child.isUpdatedSince(timestamp)) {
        LOGGER.trace.log(
          `[invalidated] by ${child.description || "anonymous"}`
        );
        isUpdated = true;
      }
    }

    return isUpdated;
  }

  validate(): FrameValidation<T> {
    if (this.isUpdatedSince(this.#finalizedAt)) {
      return { status: "invalid" };
    }

    return { status: "valid", value: this.#value };
  }
}
