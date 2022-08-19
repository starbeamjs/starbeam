import type { Stack } from "@starbeam/debug";
import {
  type DebugFilter,
  type DebugListener,
  DebugTimeline,
  // eslint-disable-next-line unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars
  ifDebug,
  isDebug,
} from "@starbeam/debug";

import { LIFETIME } from "../lifetime/api.js";
import type { Unsubscribe } from "../lifetime/object-lifetime.js";
import { FrameStack } from "./frames.js";
import { type MutableInternals, ReactiveProtocol } from "./protocol.js";
import { Subscriptions } from "./subscriptions.js";
import { NOW, Timestamp } from "./timestamp.js";

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
  static create(): Timeline {
    return new Timeline(Subscriptions.create(), new Set());
  }

  #debugTimeline: DebugTimeline | null = null;

  readonly #frame: FrameStack;
  readonly #subscriptions: Subscriptions;
  readonly #afterRender: Set<() => void>;

  private constructor(
    subscriptions: Subscriptions,
    onAdvance: Set<() => void>
  ) {
    this.#subscriptions = subscriptions;
    this.#afterRender = onAdvance;
    this.#frame = FrameStack.empty(this, subscriptions);
  }

  on = {
    rendered: (callback: () => void): (() => void) => {
      this.#afterRender.add(callback);

      return () => {
        this.#afterRender.delete(callback);
      };
    },

    change: (
      input: ReactiveProtocol,
      ready: (internals: MutableInternals) => void
    ): Unsubscribe => {
      return this.#subscriptions.register(input, ready);
    },
  } as const;

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

  // Returns the current timestamp
  get now(): Timestamp {
    return NOW.now;
  }

  get frame(): FrameStack {
    return this.#frame;
  }

  // Increment the current timestamp and return the incremented timestamp.
  bump(mutable?: MutableInternals): Timestamp {
    if (isDebug() && mutable) {
      this.#debug.updateCell(mutable);
    }

    const now = NOW.bump();

    if (mutable) {
      this.#subscriptions.notify(mutable);
    }

    return now;
  }

  mutation<T>(description: string, callback: () => T): T {
    if (isDebug()) {
      return this.#debug.mutation(description, callback);
    }

    return callback();
  }

  /// DEBUG MODE ///

  /**
   * Dynamic assertions that are used in development mode to detect reads that occur outside of a
   * tracking frame, but which are used to produce rendered outputs.
   */
  #readAssertions = new Set<
    (reactive: ReactiveProtocol, caller: Stack) => void
  >();

  /** @internal */
  untrackedRead(cell: ReactiveProtocol, caller: Stack): void {
    for (const assertion of this.#readAssertions) {
      assertion(cell, caller);
    }
  }

  @ifDebug
  attach(
    notify: () => void,
    options: { filter: DebugFilter } = { filter: { type: "all" } }
  ): DebugListener {
    const listener = this.#debug.attach(notify, options);

    LIFETIME.on.cleanup(listener, () => listener.detach());

    return listener;
  }

  get #debug() {
    if (!this.#debugTimeline) {
      const debugTimeline = (this.#debugTimeline = DebugTimeline.create(
        Timestamp.zero(),
        ReactiveProtocol
      ));
      this.on.rendered(() => debugTimeline.notify());
    }

    return this.#debugTimeline;
  }

  /**
   * In debug mode, register a barrier for untracked reads. This allows you to throw an error if an
   * untracked read occurred in a context (such as a render function) that a renderer knows will
   * produce rendered content.
   */
  @ifDebug
  untrackedReadBarrier(
    assertion: (reactive: ReactiveProtocol, caller: Stack) => void
  ): void {
    this.#readAssertions.add(assertion);
  }
}
