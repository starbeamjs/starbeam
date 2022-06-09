import { isArray } from "@starbeam/core-utils";
import { type DescriptionArgs, FormulaDescription } from "@starbeam/debug";
import { TimestampValidatorDescription } from "@starbeam/debug";
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
    description: DescriptionArgs
  ): CompositeInternalsImpl {
    return new CompositeInternalsImpl(children, description);
  }

  readonly type = "composite";

  #children: InternalChildren;
  readonly #description: FormulaDescription;

  private constructor(
    children: InternalChildren,
    description: DescriptionArgs
  ) {
    this.#children = children;
    this.#description = FormulaDescription.from({
      ...description,
      validator: TimestampValidatorDescription.from(this),
    });
  }

  get debug() {
    return {
      lastUpdated: this.#children.lastUpdated,
    };
  }

  get [REACTIVE](): ReactiveInternals {
    return this;
  }

  get description(): FormulaDescription {
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
  description: DescriptionArgs
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
