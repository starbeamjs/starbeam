import type { DebugTimeline, Stack } from "@starbeam/debug";
import type { Description, Diff, MutableInternals } from "@starbeam/interfaces";
import { type UNINITIALIZED, REACTIVE } from "../../../shared/index.js";

// eslint-disable-next-line import/no-cycle
import { type Frame, ActiveFrame } from "./frame.js";
import { ReactiveProtocol } from "./protocol.js";
import type { Subscriptions } from "./subscriptions.js";
import type { Timeline } from "./timeline.js";

export class FrameStack {
  static empty(timeline: Timeline, subscriptions: Subscriptions): FrameStack {
    return new FrameStack(subscriptions, null, timeline);
  }

  static didConsumeCell(
    frames: FrameStack,
    reactive: ReactiveProtocol<MutableInternals>,
    caller: Stack
  ): void {
    frames.#debug.consumeCell(reactive[REACTIVE], caller);
    frames.#didConsumeReactive(reactive, caller);
  }

  static didConsumeFrame(
    frames: FrameStack,
    frame: Frame,
    diff: Diff<MutableInternals>,
    caller: Stack
  ): void {
    frames.#debug.consumeFrame(frame, diff, caller);
    frames.#didConsumeReactive(frame, caller);
  }

  #subscriptions: Subscriptions;
  #current: ActiveFrame<unknown> | null;
  #timeline: Timeline;

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

  finally<T>(prev: ActiveFrame<T> | null): void {
    this.#current = prev;
  }

  // Indicate that a particular cell was used inside of the current computation.
  #didConsumeCell(
    reactive: ReactiveProtocol<MutableInternals>,
    caller: Stack
  ): void {
    this.#debug.consumeCell(reactive[REACTIVE], caller);
    this.#didConsumeReactive(reactive, caller);
  }

  #didConsumeFrame(reactive: Frame, caller: Stack): void {
    this.#didConsumeReactive(reactive, caller);
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

      for (const reactive of delegatesTo) {
        if (ReactiveProtocol.is(reactive, "mutable")) {
          this.#timeline.untrackedRead(reactive, caller);
        }
      }
    }
  }

  create<T>(options: { evaluate: () => T; description: Description }): Frame<T>;
  create<T>(options: { description: Description }): ActiveFrame<T>;
  create<T>({
    evaluate,
    description,
  }: {
    evaluate?: () => T;
    description: Description;
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

  update<T>(options: {
    updating: Frame<T | UNINITIALIZED>;
    evaluate: () => T;
  }): Frame<T>;
  update<T>({
    updating,
  }: {
    updating: Frame<T | UNINITIALIZED>;
  }): ActiveFrame<T>;
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

  #start<T>(description: Description, frame?: Frame<T>) {
    const prev = this.#current;
    return (this.#current = ActiveFrame.create(
      frame ?? null,
      prev,
      description
    ));
  }

  #end<T>(active: ActiveFrame<T>, value: T): Frame<T> {
    const { prev, frame } = active.finalize(value, this.#timeline);
    this.#current = prev;
    return frame;
  }
}
