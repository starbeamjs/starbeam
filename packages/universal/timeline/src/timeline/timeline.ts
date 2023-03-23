import type { Stack } from "@starbeam/debug";
import { DebugTimeline } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { CellTag, Tagged } from "@starbeam/interfaces";
import { getNow, NOW } from "@starbeam/tags";

import type { Unsubscribe } from "../lifetime/object-lifetime.js";
import { TaggedUtils } from "../utils/utils.js";
import { FrameStack } from "./frames.js";
import { type NotifyReady, Subscriptions } from "./subscriptions.js";

type TimelineOp = "consumed" | "bumped" | "evaluating" | "initial";

/**
 * # How Subscriptions Work at the Lowest Level
 *
 * You subscribe to an object implementing ReactiveProtocol by using `Timeline#on.change`.
 *
 * ## Composites
 *
 * If the object represents a composite, the {@linkcode Timeline} will immediately subscribe to the
 * dependencies of the composite.
 *
 * Whenever any of those dependencies change, the timeline will notify the subscriber. Whenever a
 * reactive object's composite dependencies may have changed (i.e. when it was polled), the object
 * is responsible for calling `TIMELINE.update(object)` to notify the timeline. This updates the
 * internal dependencies of that object used for notifications.
 *
 * ## Delegates
 *
 * If an object implementing {@linkcode ReactiveCore} simply polls another reactive object, it
 * can use a {@linkcode DelegateInternals} property to point to that object. In this case, the
 * object doesn't need to worry about `TIMELINE.update`.
 *
 * ## Notifications
 *
 * Whenever a {@linkcode MutableInternals} is updated, the timeline will notify all subscribers of
 * reactives that depend on that dependency.
 */
export class Timeline {
  #debugTimeline: DebugTimeline | null = null;
  readonly #frame: FrameStack;

  on = {
    change: (target: Tagged, ready: NotifyReady): Unsubscribe => {
      return this.#subscriptions.register(target, ready);
    },
  } as const;

  /**
   * Dynamic assertions that are used in development mode to detect reads that occur outside of a
   * tracking frame, but which are used to produce rendered outputs.
   */
  #readAssertions = new Set<
    (reactive: interfaces.Tag, caller: Stack) => void
  >();

  readonly #subscriptions: Subscriptions;
  #lastOp: TimelineOp;

  /**
   * In debug mode, register a barrier for untracked reads. This allows you to throw an error if an
   * untracked read occurred in a context (such as a render function) that a renderer knows will
   * produce rendered content.
   */
  declare untrackedReadBarrier: (
    assertion: (reactive: interfaces.Tag, caller: Stack) => void
  ) => void;

  static create(): Timeline {
    return new Timeline(Subscriptions.create(), "initial");
  }

  private constructor(subscriptions: Subscriptions, lastOp: TimelineOp) {
    this.#subscriptions = subscriptions;
    this.#frame = FrameStack.empty(this, subscriptions);
    this.#lastOp = lastOp;

    if (import.meta.env.DEV) {
      this.untrackedReadBarrier = (
        assertion: (reactive: interfaces.Tag, caller: Stack) => void
      ): void => {
        this.#readAssertions.add(assertion);
      };
    }
  }

  get #debug(): DebugTimeline {
    if (!this.#debugTimeline) {
      this.#debugTimeline = DebugTimeline.create({ now: getNow }, TaggedUtils);
    }

    return this.#debugTimeline;
  }

  get frame(): FrameStack {
    return this.#frame;
  }

  get log(): DebugTimeline {
    return this.#debug;
  }

  // Returns the current timestamp
  get now(): interfaces.Timestamp {
    return NOW.now;
  }

  #adjustTimestamp(
    operation: "consumed" | "bumped" | "evaluating"
  ): interfaces.Timestamp {
    const prev = this.#lastOp;
    const prevIsRead = prev === "consumed" || prev === "evaluating";
    const nextIsRead = operation === "consumed" || operation === "evaluating";

    this.#lastOp = operation;
    if (prevIsRead === nextIsRead) {
      return this.now;
    } else {
      return this.next();
    }
  }

  bump(mutable: interfaces.CellTag, caller: Stack): interfaces.Timestamp {
    const now = this.#adjustTimestamp("bumped");

    if (import.meta.env.DEV) {
      this.#debug.updateCell(mutable, caller);
    }

    this.#subscriptions.notify(mutable);
    return now;
  }

  didConsumeCell(cell: Tagged<CellTag>, caller: Stack): void {
    this.#adjustTimestamp("consumed");
    FrameStack.didConsumeCell(this.#frame, cell, caller);
  }

  didConsumeFrame(
    frame: interfaces.Frame,
    diff: interfaces.Diff<interfaces.CellTag>,
    caller: Stack
  ): void {
    this.#adjustTimestamp("consumed");
    FrameStack.didConsumeFrame(this.#frame, frame, diff, caller);
  }

  next(): interfaces.Timestamp {
    return NOW.bump();
  }

  /**
   * When a reactive's dependencies might have changed, any renderables that depend on this reactive
   * need to refresh their dependencies. If there are no renderers for this reactive value,
   * {@linkcode update} does nothing.
   *
   * Otherwise, each relevant renderable will unsubscribe from any stale dependencies and subscribe
   * to any new dependencies.
   *
   * For example, Formulas call this method after recomputing their value, which results in a
   * possible change to their dependencies.
   */
  update(reactive: interfaces.Tagged<interfaces.FormulaTag>): void {
    this.#subscriptions.update(reactive);
  }

  willEvaluate(): void {
    this.#lastOp = "evaluating";
  }

  mutation<T>(description: string, callback: () => T): T {
    if (import.meta.env.DEV) {
      return this.#debug.mutation(description, callback);
    }

    return callback();
  }

  /// DEBUG MODE ///

  /** @internal */
  untrackedRead(cell: CellTag, caller: Stack): void {
    for (const assertion of this.#readAssertions) {
      assertion(cell, caller);
    }
  }
}
