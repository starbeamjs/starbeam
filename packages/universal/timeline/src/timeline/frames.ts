import type { DebugTimeline, Stack } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { CellTag, Tagged } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { getTag } from "@starbeam/tags";

import { ActiveFrame, type Frame } from "./frame.js";
import type { Subscriptions } from "./subscriptions.js";
import type { Timeline } from "./timeline.js";

export class FrameStack {
  #current: ActiveFrame<unknown> | null;
  #subscriptions: Subscriptions;
  #timeline: Timeline;

  static didConsumeCell(
    frames: FrameStack,
    reactive: Tagged<CellTag>,
    caller: Stack
  ): void {
    frames.#debug.consumeCell(reactive[TAG], caller);
    frames.#didConsumeReactive(reactive, caller);
  }

  static didConsumeFrame(
    frames: FrameStack,
    frame: interfaces.Frame,
    diff: interfaces.Diff<interfaces.CellTag>,
    caller: Stack
  ): void {
    frames.#debug.consumeFrame(frame, diff, caller);
    frames.#didConsumeReactive(frame, caller);
  }

  static empty(timeline: Timeline, subscriptions: Subscriptions): FrameStack {
    return new FrameStack(subscriptions, null, timeline);
  }

  constructor(
    subscriptions: Subscriptions,
    current: ActiveFrame<unknown> | null,
    timeline: Timeline
  ) {
    this.#subscriptions = subscriptions;
    this.#current = current;
    this.#timeline = timeline;
  }

  get currentFrame(): ActiveFrame<unknown> | null {
    return this.#current;
  }

  get #debug(): DebugTimeline {
    return this.#timeline.log;
  }

  /**
   * Evaluate a block of code, returning a new Frame.
   */
  evaluate<T>(
    block: () => T,
    {
      description,
    }: {
      description: interfaces.Description;
    }
  ): Frame<T> {
    const frame = this.#start(description) as ActiveFrame<T>;

    try {
      const result = block();
      return this.#end<T>(frame, result);
    } catch (e) {
      this.finally(frame);
      throw e;
    }
  }

  /**
   * Open a new frame, returning an `ActiveFrame`.
   *
   * Any consumptions between a call to `open()` and the call to
   * {@linkcode ActiveFrame.prototype.finalize ActiveFrame#finalize} are assigned to this frame.
   */
  open<T>({
    description,
  }: {
    description: interfaces.Description;
  }): ActiveFrame<T> {
    return this.#start(description) as ActiveFrame<T>;
  }

  #didConsumeReactive(reactive: Tagged, caller: Stack): void {
    const frame = this.currentFrame;
    if (frame) {
      frame.add(reactive);
      return;
    } else {
      const delegatesTo = [...getTag(reactive).subscriptionTargets()];

      for (const target of delegatesTo) {
        if (target.type === "cell") {
          this.#timeline.untrackedRead(target, caller);
        }
      }
    }
  }

  #end<T>(active: ActiveFrame<T>, value: T): Frame<T> {
    const { prev, frame } = active.finalize(value, this.#timeline);
    this.#current = prev;
    return frame;
  }

  finally<T>(prev: ActiveFrame<T> | null): void {
    this.#current = prev;
  }

  /** @internal */
  start<T>(frame: Frame<T>): ActiveFrame<T> {
    return this.#start(frame.description, frame) as ActiveFrame<T>;
  }

  /** @internal */
  willEvaluate(): void {
    this.#timeline.willEvaluate();
  }

  /** @internal */
   end<T>(frame: ActiveFrame<T>, value: T): Frame<T> {
    return this.#end(frame, value);
  }

  /** @internal */
  updateSubscriptions<T>(frame: Frame<T>): void {
    this.#subscriptions.update(frame);
  }

  #start<T>(
    description: interfaces.Description,
    frame?: Frame<T>
  ): ActiveFrame<unknown> {
    const prev = this.#current;
    return (this.#current = ActiveFrame.create(
      frame ?? null,
      prev,
      description
    ));
  }

  update<T>(frame: Frame<T>): ActiveFrame<T> {
    return this.#start(frame.description, frame) as ActiveFrame<T>;
  }
}
