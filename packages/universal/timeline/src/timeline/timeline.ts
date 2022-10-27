import type { Stack } from "@starbeam/debug";
import {
  type DebugFilter,
  type DebugListener,
  DebugTimeline,
} from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";

import { LIFETIME } from "../lifetime/api.js";
import type { Unsubscribe } from "../lifetime/object-lifetime.js";
import { FrameStack } from "./frames.js";
import { ReactiveProtocol } from "./protocol.js";
import { Subscriptions } from "./subscriptions.js";
import { getNow, NOW } from "./timestamp.js";

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
 * If an object implementing {@linkcode ReactiveProtocol} simply polls another reactive object, it
 * can use a {@linkcode DelegateInternals} property to point to that object. In this case, the
 * object doesn't need to worry about `TIMELINE.update`.
 *
 * ## Notifications
 *
 * Whenever a {@linkcode MutableInternals} is updated, the timeline will notify all subscribers of
 * reactives that depend on that dependency.
 */
export class Timeline {
  readonly #afterRender: Set<() => void>;

  declare attach: (
    notify: () => void,
    options?: { filter: DebugFilter }
  ) => DebugListener;

  #debugTimeline: DebugTimeline | null = null;
  readonly #frame: FrameStack;
  #lastOp: "consumed" | "bumped" | "evaluating" | "initial";

  on = {
    rendered: (callback: () => void): (() => void) => {
      this.#afterRender.add(callback);

      return () => {
        this.#afterRender.delete(callback);
      };
    },

    change: (
      input: ReactiveProtocol,
      ready: (internals: interfaces.MutableInternals) => void
    ): Unsubscribe => {
      return this.#subscriptions.register(input, ready);
    },
  } as const;

  /**
   * Dynamic assertions that are used in development mode to detect reads that occur outside of a
   * tracking frame, but which are used to produce rendered outputs.
   */
  #readAssertions = new Set<
    (reactive: ReactiveProtocol, caller: Stack) => void
  >();

  readonly #subscriptions: Subscriptions;

  /**
   * In debug mode, register a barrier for untracked reads. This allows you to throw an error if an
   * untracked read occurred in a context (such as a render function) that a renderer knows will
   * produce rendered content.
   */
  declare untrackedReadBarrier: (
    assertion: (reactive: ReactiveProtocol, caller: Stack) => void
  ) => void;

  static create(): Timeline {
    return new Timeline(Subscriptions.create(), new Set(), "initial");
  }

  private constructor(
    subscriptions: Subscriptions,
    onAdvance: Set<() => void>,
    lastOp: "consumed" | "bumped" | "evaluating" | "initial"
  ) {
    this.#subscriptions = subscriptions;
    this.#afterRender = onAdvance;
    this.#frame = FrameStack.empty(this, subscriptions);
    this.#lastOp = lastOp;

    if (import.meta.env.DEV) {
      this.attach = (
        notify: () => void,
        options: { filter: DebugFilter } = { filter: { type: "all" } }
      ): DebugListener => {
        const listener = this.#debug.attach(notify, options);

        LIFETIME.on.cleanup(listener, () => {
          listener.detach();
        });

        return listener;
      };

      this.untrackedReadBarrier = (
        assertion: (reactive: ReactiveProtocol, caller: Stack) => void
      ): void => {
        this.#readAssertions.add(assertion);
      };
    }
  }

  get #debug(): DebugTimeline {
    if (!this.#debugTimeline) {
      const debugTimeline = (this.#debugTimeline = DebugTimeline.create(
        { now: getNow },
        ReactiveProtocol
      ));
      this.on.rendered(() => {
        debugTimeline.notify();
      });
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

  bump(
    mutable: interfaces.MutableInternals,
    caller: Stack
  ): interfaces.Timestamp {
    const now = this.#adjustTimestamp("bumped");

    if (import.meta.env.DEV) {
      this.#debug.updateCell(mutable, caller);
    }

    this.#subscriptions.notify(mutable);
    return now;
  }

  didConsumeCell(
    cell: ReactiveProtocol<interfaces.MutableInternals>,
    caller: Stack
  ): void {
    this.#adjustTimestamp("consumed");
    FrameStack.didConsumeCell(this.#frame, cell, caller);
  }

  didConsumeFrame(
    frame: interfaces.Frame,
    diff: interfaces.Diff<interfaces.MutableInternals>,
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
  update(reactive: ReactiveProtocol): void {
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
  untrackedRead(cell: ReactiveProtocol, caller: Stack): void {
    for (const assertion of this.#readAssertions) {
      assertion(cell, caller);
    }
  }
}
