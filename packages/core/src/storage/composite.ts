import { isArray } from "@starbeam/core-utils";
import { ifDebug, type Description } from "@starbeam/debug";
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
    description: Description
  ): CompositeInternalsImpl {
    return new CompositeInternalsImpl(children, description);
  }

  readonly type = "composite";

  #children: InternalChildren;
  readonly #description: Description;

  private constructor(children: InternalChildren, description: Description) {
    this.#children = children;
    this.#description = description;
  }

  @ifDebug
  get debug() {
    return {
      lastUpdated: this.#children.lastUpdated,
    };
  }

  get [REACTIVE](): ReactiveInternals {
    return this;
  }

  get description(): Description {
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
  description: Description
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
