import type { Description } from "@starbeam/debug";
import {
  FormulaDescription,
  TimestampValidatorDescription,
  type DescriptionArgs,
} from "@starbeam/debug";

import { InternalChildren, type IsUpdatedSince } from "./internals.js";
import {
  REACTIVE,
  type CompositeInternals,
  type MutableInternals,
  type ReactiveInternals,
  type ReactiveProtocol,
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
  static create(description: DescriptionArgs): ActiveFrame {
    return new ActiveFrame(new Set(), description);
  }

  readonly #children: Set<ReactiveProtocol>;

  private constructor(
    children: Set<ReactiveProtocol>,
    readonly description: DescriptionArgs
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
    description: DescriptionArgs;
  }): FinalizedFrame<T> {
    return new FinalizedFrame(children, finalizedAt, value, description);
  }

  readonly #children: Set<ReactiveProtocol>;
  readonly #finalizedAt: Timestamp;
  readonly #value: T;
  readonly #composite: CompositeInternals;

  private constructor(
    children: Set<ReactiveProtocol>,
    finalizedAt: Timestamp,
    value: T,
    readonly description: DescriptionArgs
  ) {
    this.#children = children;
    this.#finalizedAt = finalizedAt;
    this.#value = value;

    this.#composite = {
      type: "composite",
      isUpdatedSince: (timestamp) => {
        return [...this.#children].some((child) =>
          child[REACTIVE].isUpdatedSince(timestamp)
        );
      },
      debug: {
        lastUpdated: this.#finalizedAt,
      },
      children: () => {
        return InternalChildren.from(this.children);
      },
    } as CompositeInternals;

    (
      this.#composite as ReactiveInternals & { description: Description }
    ).description = FormulaDescription.from({
      ...description,
      validator: TimestampValidatorDescription.from(this.#composite),
    });
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#composite;
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
