import type { Description } from "@starbeam/debug";
import {
  TIMELINE,
  type ActiveFrame,
  type Frame,
  type Unsubscribe,
} from "@starbeam/timeline";
import { expected, isPresent, verify } from "@starbeam/verify";

export class ComponentFrame {
  static #frames: WeakMap<object, ComponentFrame> = new WeakMap();

  static start(component: object, description: Description): void {
    let frame = ComponentFrame.#frames.get(component);

    if (!frame) {
      frame = new ComponentFrame(null, null, null);
      ComponentFrame.#frames.set(component, frame);
    }

    frame.#start(description);
  }

  static end(component: object, subscription?: () => void): Frame {
    const frame = ComponentFrame.#frames.get(component);

    verify(
      frame,
      isPresent,
      expected.when("in Preact's _diff hook").as("a tracking frame")
    );

    return frame.#end(subscription);
  }

  static unmount(component: object): void {
    const frame = ComponentFrame.#frames.get(component);

    if (frame) {
      frame.#unmount();
    }
  }

  #frame: Frame | null;
  #active: ActiveFrame<unknown> | null;
  #subscription: Unsubscribe | null;

  private constructor(
    frame: Frame | null,
    active: ActiveFrame<unknown> | null,
    subscribed: Unsubscribe | null
  ) {
    this.#frame = frame;
    this.#active = active;
    this.#subscription = subscribed;
  }

  #start(description: Description): void {
    if (this.#frame) {
      this.#active = TIMELINE.frame.update({ updating: this.#frame });
    } else {
      this.#active = TIMELINE.frame.create({
        description,
      });
    }
  }

  #end(subscription: (() => void) | void): Frame {
    verify(
      this.#active,
      isPresent,
      expected.when("in preact's _diff hook").as("an active tracking frame")
    );

    const frame = (this.#frame = this.#active.finalize(null, TIMELINE).frame);
    this.#active = null;

    if (subscription) {
      this.#subscription = TIMELINE.on.change(frame, subscription);
    }

    return frame;
  }

  #unmount(): void {
    if (this.#subscription) {
      this.#subscription();
      this.#subscription = null;
    }
  }
}
