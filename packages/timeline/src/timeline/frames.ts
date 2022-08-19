import type { Description, Stack } from "@starbeam/debug";
import type { UNINITIALIZED } from "@starbeam/peer";

// eslint-disable-next-line import/no-cycle
import { type Frame, ActiveFrame } from "./frame.js";
import type { ReactiveProtocol } from "./protocol.js";
import type { Subscriptions } from "./subscriptions.js";
import type { Timeline } from "./timeline.js";

export class FrameStack {
  static empty(timeline: Timeline, subscriptions: Subscriptions): FrameStack {
    return new FrameStack(subscriptions, null, timeline);
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

  finally<T>(prev: ActiveFrame<T> | null): void {
    this.#current = prev;
  }

  // Indicate that a particular cell was used inside of the current computation.
  didConsume(reactive: ReactiveProtocol, caller: Stack): void {
    const frame = this.currentFrame;
    if (frame) {
      frame.add(reactive);
      return;
    } else {
      this.#timeline.untrackedRead(reactive, caller);
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
