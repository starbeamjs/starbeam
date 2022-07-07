import type { Description } from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";

import { type IsUpdatedSince, InternalChildren } from "./internals.js";
import type {
  CompositeInternals,
  MutableInternals,
  ReactiveInternals,
  ReactiveProtocol,
} from "./reactive.js";
import type { Timestamp } from "./timestamp.js";

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

class Composite implements CompositeInternals {
  readonly type = "composite";
  readonly #children: Set<ReactiveProtocol>;
  readonly [REACTIVE] = this;

  constructor(
    children: Set<ReactiveProtocol>,
    readonly description: Description,
    readonly debug: { lastUpdated: Timestamp }
  ) {
    this.#children = children;
  }

  children(): InternalChildren {
    return InternalChildren.from([...this.#children]);
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return [...this.#children].some((child) =>
      child[REACTIVE].isUpdatedSince(timestamp)
    );
  }
}

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
  readonly #composite: CompositeInternals;

  private constructor(
    children: Set<ReactiveProtocol>,
    finalizedAt: Timestamp,
    value: T,
    readonly description: Description
  ) {
    this.#children = children;
    this.#finalizedAt = finalizedAt;
    this.#value = value;

    this.#composite = new Composite(children, description, {
      lastUpdated: finalizedAt,
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

    for (const child of this.#children) {
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
