import { assert } from "console";
import { UNINITIALIZED_REACTIVE } from "./constants.js";
import type { FinalizedFrame, FrameChild, FrameValidation } from "./frames.js";
import { REACTIVE, type ReactiveProtocol } from "./reactive.js";
import type { Timestamp } from "./timestamp.js";

type InferReturn = any;

export interface IsUpdatedSince {
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface ReactiveInternals extends IsUpdatedSince {
  readonly type:
    | "static"
    | "mutable"
    | "derived"
    | "uninitialized"
    | "composite";
  readonly description: string;
}

export interface StaticInternals extends ReactiveInternals {
  readonly type: "static";
}

export interface UninitializedCompositeInternals extends ReactiveInternals {
  readonly type: "composite";
  readonly state: "uninitialized";
  initialize(
    dependencies: readonly ReactiveInternals[]
  ): InitializedCompositeInternals;
}

export interface InitializedCompositeInternals extends ReactiveInternals {
  readonly type: "composite";
  readonly state: "initialized";
  dependencies(): readonly ReactiveInternals[];
  update(dependencies: readonly ReactiveInternals[]): void;
}

export type CompositeInternals =
  | UninitializedCompositeInternals
  | InitializedCompositeInternals;

/**
 * You can subscribe to UninitializedInternals, and get notified once the value
 * has initialized.
 */
export interface UninitializedInternals extends ReactiveInternals {
  readonly type: "uninitialized";
}

export interface MutableInternals extends ReactiveInternals {
  readonly type: "mutable";

  readonly debug: { lastUpdated: Timestamp };

  isFrozen(): boolean;
  freeze(): void;
  update(): void;
  consume(): void;
}

export interface UninitializedDerivedInternals extends ReactiveInternals {
  readonly type: "derived";
  readonly state: "uninitialized";

  initialize<T>(frame: FinalizedFrame<T>): InitializedDerivedInternals<T>;
}

export interface InitializedDerivedInternals<T> extends ReactiveInternals {
  readonly type: "derived";
  readonly state: "initialized";

  readonly frame: FinalizedFrame<T>;

  children(): ReadonlySet<FrameChild>;
  validate(): FrameValidation<T>;
  update(frame: FinalizedFrame<T>): void;
  dependencies(): readonly MutableInternals[];
}

export type DerivedInternals<T> =
  | UninitializedDerivedInternals
  | InitializedDerivedInternals<T>;

export type SpecificClassifiedInternals<T> =
  | StaticInternals
  | MutableInternals
  | UninitializedDerivedInternals
  | InitializedDerivedInternals<T>;

export type ClassifiedInternals<R extends ReactiveInternals> =
  R extends SpecificClassifiedInternals<unknown> & infer S
    ? S
    : SpecificClassifiedInternals<unknown>;

export const ReactiveInternals = new (class {
  classify<R extends ReactiveInternals>(internals: R): ClassifiedInternals<R> {
    return internals as InferReturn;
  }

  get(reactive: ReactiveProtocol): ReactiveInternals {
    return reactive[REACTIVE];
  }

  /**
   * If currentDependencies returns [], that means that the internal is
   * constant. This function will return `UNINITIALIZED_REACTIVE` to indicate
   * that there are no dependencies *yet*.
   */
  currentDependencies(
    internals: ReactiveInternals,
    options: { assert: "initialized" }
  ): readonly MutableInternals[];
  currentDependencies(
    internals: ReactiveInternals
  ): readonly MutableInternals[] | UNINITIALIZED_REACTIVE;
  currentDependencies(
    internals: ReactiveInternals,
    options?: { assert: "initialized" }
  ): readonly MutableInternals[] | UNINITIALIZED_REACTIVE {
    const classified = ReactiveInternals.classify(internals);

    switch (classified.type) {
      case "static":
        return [];
      case "mutable":
        return [classified];
      case "derived": {
        switch (classified.state) {
          case "initialized":
            return classified.dependencies();
          case "uninitialized":
            {
              assert(
                !options,
                `Expected currentDependencies of ${internals.description} to be initialized, but it wasn't`
              );
            }

            return UNINITIALIZED_REACTIVE;
        }
      }
    }
  }
})();
