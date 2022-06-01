import { isArray } from "@starbeam/core-utils";
import {
  type ReactiveInternals,
  type ReactiveProtocol,
  type Timestamp,
  InternalChildren,
  REACTIVE,
} from "@starbeam/timeline";

export class CompositeInternalsImpl implements ReactiveProtocol {
  static create(
    children: InternalChildren,
    description: string
  ): CompositeInternalsImpl {
    return new CompositeInternalsImpl(children, description);
  }

  readonly type = "composite";

  #children: InternalChildren;
  readonly #description: string;

  private constructor(children: InternalChildren, description: string) {
    this.#children = children;
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    return this;
  }

  get description(): string {
    return this.#description;
  }

  children(): InternalChildren {
    return this.#children;
  }

  update(children: InternalChildren): void {
    this.#children = children;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.#children.isUpdatedSince(timestamp);
  }
}

export function CompositeInternals(
  children: InternalChildren | readonly ReactiveProtocol[],
  description: string
): CompositeInternalsImpl {
  if (isArray(children)) {
    return CompositeInternalsImpl.create(
      InternalChildren.from(children),
      description
    );
  } else {
    return CompositeInternalsImpl.create(children, description);
  }
}
