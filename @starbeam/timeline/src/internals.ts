import { assert } from "@starbeam/debug";
import { Enum } from "@starbeam/utils";
import { exhaustive } from "@starbeam/verify";
import { UNINITIALIZED_REACTIVE } from "./constants.js";
import type { FinalizedFrame, FrameChild, FrameValidation } from "./frames.js";
import { REACTIVE, type ReactiveProtocol } from "./reactive.js";
import type { Timestamp } from "./timestamp.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  initialize(dependencies: CompositeChild): InitializedCompositeInternals;
}

export class CompositeChild extends Enum("Leaf(T)", "Interior(U)")<
  MutableInternals,
  readonly ReactiveInternals[]
> {
  get dependencies(): readonly MutableInternals[] {
    return this.match({
      Interior: (internals) =>
        internals.flatMap((internals) =>
          ReactiveInternals.currentDependencies(internals)
        ),
      Leaf: (leaf) => [leaf],
    });
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.match({
      Leaf: (leaf) => leaf.isUpdatedSince(timestamp),
      Interior: (dependencies) =>
        dependencies.some((dep) => dep.isUpdatedSince(timestamp)),
    });
  }
}

export interface InitializedCompositeInternals extends ReactiveInternals {
  readonly type: "composite";
  readonly state: "initialized";
  children(): CompositeChild;
  update(dependencies: CompositeChild): void;
}

export type CompositeInternals =
  | UninitializedCompositeInternals
  | InitializedCompositeInternals;

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

  readonly initialized: MutableInternals;

  initialize<T>(frame: FinalizedFrame<T>): InitializedDerivedInternals<T>;
  dependencies(): readonly MutableInternals[];
}

export interface InitializedDerivedInternals<T> extends ReactiveInternals {
  readonly type: "derived";
  readonly state: "initialized";

  readonly initialized: MutableInternals;
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
  | CompositeInternals
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
    options: { assert: "initialized"; original?: ReactiveInternals }
  ): readonly MutableInternals[];
  currentDependencies(
    internals: InitializedInternals,
    options?: { original?: ReactiveInternals }
  ): readonly MutableInternals[];
  currentDependencies(
    internals: ReactiveInternals,
    options?: { readonly original?: ReactiveInternals }
  ): readonly MutableInternals[] | UNINITIALIZED_REACTIVE;
  currentDependencies(
    internals: ReactiveInternals,
    options?: {
      readonly assert: "initialized";
      readonly original?: ReactiveInternals;
    }
  ): readonly MutableInternals[] | UNINITIALIZED_REACTIVE;
  currentDependencies(
    internals: ReactiveInternals,
    options?: {
      readonly assert: "initialized";
      readonly original?: ReactiveInternals;
    }
  ): readonly MutableInternals[] | UNINITIALIZED_REACTIVE {
    const classified = ReactiveInternals.classify(internals);

    switch (classified.type) {
      case "static":
        return [];
      case "mutable":
        return classified.isFrozen() ? [] : [classified];
      case "derived": {
        switch (classified.state) {
          case "initialized":
            return classified.dependencies();
          case "uninitialized":
            {
              assert(
                options?.assert !== "initialized",
                `Expected currentDependencies of ${
                  internals.description
                } to be initialized${
                  options?.original
                    ? `(for ${options.original.description})`
                    : ``
                }, but it wasn't`
              );
            }

            return UNINITIALIZED_REACTIVE;
          default:
            exhaustive(classified, "classified.state");
        }
      }
      case "composite": {
        switch (classified.state) {
          case "initialized": {
            const children: MutableInternals[] = [];

            for (const child of classified.children().dependencies) {
              assertInitialized(options?.assert, child, options?.original);
              const dependencies = ReactiveInternals.currentDependencies(
                child,
                options
              );

              children.push(...dependencies);
            }

            return children;
          }
          case "uninitialized": {
            assertInitialized(options?.assert, classified, options?.original);

            return UNINITIALIZED_REACTIVE;
          }
        }
      }

      default:
        exhaustive(classified, "classified.type");
    }
  }
})();

type UninitializedInternals =
  | UninitializedCompositeInternals
  | UninitializedDerivedInternals;
type InitializedInternals = Exclude<ReactiveInternals, UninitializedInternals>;

/**
 * @strip noop
 */
function assertInitialized(
  expected: "initialized" | undefined,
  reactive: ReactiveInternals,
  original?: ReactiveInternals
): asserts reactive is InitializedInternals {
  if (expected === undefined) {
    return;
  }

  const message = [
    `INTERNAL BUG: Expected currentDependencies of ${reactive.description}`,
  ];

  if (original) {
    message.push(` (in ${original.description})`);
  }

  message.push(` to be initialized, but it wasn't`);

  throw Error(message.join(""));
}
