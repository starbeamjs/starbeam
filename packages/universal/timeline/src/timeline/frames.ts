import type { DebugTimeline, Stack } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { type UNINITIALIZED, REACTIVE } from "@starbeam/shared";

import { type Frame, ActiveFrame } from "./frame.js";
import { ReactiveProtocol } from "./protocol.js";
import type { Subscriptions } from "./subscriptions.js";
import type { Timeline } from "./timeline.js";

export class FrameStack {
  #current: ActiveFrame<unknown> | null;
  #subscriptions: Subscriptions;
  #timeline: Timeline;

  static didConsumeCell(
    frames: FrameStack,
    reactive: ReactiveProtocol<interfaces.MutableInternals>,
    caller: Stack
  ): void {
    frames.#debug.consumeCell(reactive[REACTIVE], caller);
    frames.#didConsumeReactive(reactive, caller);
  }

  static didConsumeFrame(
    frames: FrameStack,
    frame: interfaces.Frame,
    diff: interfaces.Diff<interfaces.MutableInternals>,
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

  create<T>(options: {
    evaluate: () => T;
    description: interfaces.Description;
  }): Frame<T>;
  // FIXME Overloads shouldn't trigger member-ordering

  create<T>(options: { description: interfaces.Description }): ActiveFrame<T>;
  // FIXME Overloads shouldn't trigger member-ordering

  create<T>({
    evaluate,
    description,
  }: {
    evaluate?: () => T;
    description: interfaces.Description;
  }): Frame<T> | ActiveFrame<T> {
    const frame = this.#start(description) as ActiveFrame<T>;

    if (evaluate) {
      try {
        const result = evaluate();
        return this.#end<T>(frame, result);
      } catch (e) {
        this.finally(frame);
        throw e;
      }
    } else {
      return frame;
    }
  }

  #didConsumeReactive(reactive: ReactiveProtocol, caller: Stack): void {
    const frame = this.currentFrame;
    if (frame) {
      frame.add(reactive);
      return;
    } else {
      const delegatesTo = ReactiveProtocol.subscribesTo(reactive).filter((r) =>
        ReactiveProtocol.is(r, "mutable")
      );

      for (const target of delegatesTo) {
        if (ReactiveProtocol.is(target, "mutable")) {
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

  update<T>(options: {
    updating: Frame<T | UNINITIALIZED>;
    evaluate: () => T;
  }): Frame<T>;
  // FIXME Overloads shouldn't trigger member-ordering

  update<T>({
    updating,
  }: {
    updating: Frame<T | UNINITIALIZED>;
  }): ActiveFrame<T>;
  // FIXME Overloads shouldn't trigger member-ordering

  update<T>({
    updating,
    evaluate: callback,
  }: {
    updating: Frame<T>;
    evaluate?: () => T;
  }): Frame<T> | ActiveFrame<T> {
    const activeFrame = this.#start(
      updating.description,
      updating
    ) as ActiveFrame<T>;

    if (callback) {
      try {
        this.#timeline.willEvaluate();
        const result = callback();
        const frame = this.#end<T>(activeFrame, result);
        this.#subscriptions.update(frame);
        return frame;
      } catch (e) {
        this.finally(activeFrame);
        throw e;
      }
    } else {
      return activeFrame;
    }
  }
}
