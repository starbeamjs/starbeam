import type { Description } from "@starbeam/debug";

import { type IsUpdatedSince, InternalChildren } from "./internals.js";
import {
  type MutableInternals,
  type ReactiveInternals,
  type ReactiveProtocol,
  REACTIVE,
} from "./reactive.js";
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
  static create(description: Description): ActiveFrame {
    return new ActiveFrame(new Set(), description);
  }

  readonly #children: Set<ReactiveProtocol>;

  private constructor(
    children: Set<ReactiveProtocol>,
    readonly description: Description
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
    description: Description;
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
    readonly description: Description
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
    return this.children.flatMap((child) => [
      ...child[REACTIVE].children().dependencies,
    ]);
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    let isUpdated = false;

    for (let child of this.#children) {
      if (child[REACTIVE].isUpdatedSince(timestamp)) {
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
