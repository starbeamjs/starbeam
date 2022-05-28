import {
  type IsUpdatedSince,
  type MutableInternals,
  type ReactiveInternals,
  InternalChildren,
} from "./internals.js";
import { type ReactiveProtocol, REACTIVE } from "./reactive.js";
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

export class ActiveFrame {
  static create(description: string): ActiveFrame {
    return new ActiveFrame(new Set(), description);
  }

  readonly #children: Set<ReactiveProtocol>;

  private constructor(
    children: Set<ReactiveProtocol>,
    readonly description: string
  ) {
    this.#children = children;
  }

  add(child: ReactiveProtocol): void {
    this.#children.add(child);
  }

  finalize<T>(
    value: T,
    now: Timestamp
  ): { readonly frame: FinalizedFrame<T>; readonly value: T } {
    return {
      frame: FinalizedFrame.create({
        children: this.#children,
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

export class FinalizedFrame<T = unknown>
  implements ReactiveProtocol, IsUpdatedSince
{
  static create<T>({
    children,
    finalizedAt,
    value,
    description,
  }: {
    children: Set<ReactiveProtocol>;
    finalizedAt: Timestamp;
    value: T;
    description: string;
  }): FinalizedFrame<T> {
    return new FinalizedFrame(children, finalizedAt, value, description);
  }

  readonly #children: Set<ReactiveProtocol>;
  readonly #finalizedAt: Timestamp;
  readonly #value: T;

  private constructor(
    children: Set<ReactiveProtocol>,
    finalizedAt: Timestamp,
    value: T,
    readonly description: string
  ) {
    this.#children = children;
    this.#finalizedAt = finalizedAt;
    this.#value = value;
  }

  get [REACTIVE](): ReactiveInternals {
    return {
      type: "composite",
      description: this.description,
      isUpdatedSince: (timestamp) => {
        return [...this.#children].some((child) =>
          child[REACTIVE].isUpdatedSince(timestamp)
        );
      },
      children: () => {
        return InternalChildren.from(this.children);
      },
    };
  }

  get children(): readonly ReactiveProtocol[] {
    return [...this.#children];
  }

  get dependencies(): readonly MutableInternals[] {
    return this.children.flatMap(
      (child) => child[REACTIVE].children().dependencies
    );
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    let isUpdated = false;

    for (let child of this.#children) {
      if (child[REACTIVE].isUpdatedSince(timestamp)) {
        LOGGER.trace.log(
          `[invalidated] by ${child[REACTIVE].description || "anonymous"}`
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
