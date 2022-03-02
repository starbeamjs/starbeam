import {
  ReactiveInternals,
  UNINITIALIZED_REACTIVE,
  type CompositeInternals,
  type InitializedCompositeInternals,
  type MutableInternals,
  type Timestamp,
  type UninitializedCompositeInternals,
} from "@starbeam/timeline";

type InferReturn = any;

export class UninitializedCompositeInternalsImpl
  implements UninitializedCompositeInternals
{
  static create<T>(
    description: string
  ): UninitializedCompositeInternals & CompositeInternals {
    return new UninitializedCompositeInternalsImpl(description) as InferReturn;
  }

  readonly type = "composite";
  readonly state = "uninitialized";

  readonly #description: string;

  private constructor(description: string) {
    this.#description = description;
  }

  /** impl UninitializedDerivedInternals */
  readonly isInitialized: false = false;

  get description(): string {
    return this.#description;
  }

  dependencies(): UNINITIALIZED_REACTIVE {
    return UNINITIALIZED_REACTIVE;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return false;
  }

  initialize<T>(
    children: readonly ReactiveInternals[]
  ): InitializedCompositeInternals {
    return InitializedCompositeInternalsImpl.create(
      children,
      this.#description
    );
  }
}

export class InitializedCompositeInternalsImpl
  implements InitializedCompositeInternals
{
  static create<T>(
    dependencies: readonly ReactiveInternals[],
    description: string
  ): InitializedCompositeInternalsImpl {
    return new InitializedCompositeInternalsImpl(dependencies, description);
  }

  readonly type = "composite";
  readonly state = "initialized";

  #children: readonly ReactiveInternals[];
  readonly #description: string;

  private constructor(
    children: readonly ReactiveInternals[],
    description: string
  ) {
    this.#children = children;
    this.#description = description;
  }

  /** impl InitializedCompositeInternals */

  dependencies(): readonly MutableInternals[] {
    return this.#children.flatMap((child) =>
      ReactiveInternals.currentDependencies(child, { assert: "initialized" })
    );
  }

  update(dependencies: readonly MutableInternals[]): void {
    this.#children = dependencies;
  }

  /** impl ReactiveInternals */
  readonly isInitialized: true = true;

  get description(): string {
    return this.#description;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.#children.every((dependency) =>
      dependency.isUpdatedSince(timestamp)
    );
  }
}
