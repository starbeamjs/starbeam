import { getLast } from "@starbeam/core-utils";
import type { Description, FormulaTag } from "@starbeam/interfaces";
import type { InternalComponent } from "@starbeam/preact-utils";
import type {
  FinalizedFormula,
  InitializingTrackingFrame,
} from "@starbeam/reactive";
import { DEBUG, StartTrackingFrame } from "@starbeam/reactive";
import type { Unsubscribe } from "@starbeam/runtime";
import { render, RUNTIME } from "@starbeam/runtime";
import { initializeFormulaTag } from "@starbeam/tags";
import { expected, isPresent, verify } from "@starbeam/verify";

export class ComponentFrame {
  static readonly #frames = new WeakMap<InternalComponent, ComponentFrame>();
  static readonly #stack: InternalComponent[] = [];

  static start(
    component: InternalComponent,
    description: Description | undefined,
  ): void {
    let frame = ComponentFrame.#frames.get(component);

    if (!frame) {
      frame = new ComponentFrame(null, null, null, description);
      ComponentFrame.#frames.set(component, frame);
    }

    ComponentFrame.#stack.push(component);
    frame.#start();
  }

  static isRenderingComponent(component: InternalComponent): boolean {
    const frame = ComponentFrame.#frames.get(component);

    return !!frame && frame.#active !== null;
  }

  static get current(): InternalComponent {
    const current = getLast(ComponentFrame.#stack);
    if (!current) {
      throw Error(
        "You are attempting to use a feature of Starbeam that depends on the current component, but no component is currently active.",
      );
    }
    return current;
  }

  static end(
    component: InternalComponent,
    subscription?: () => void,
  ): FinalizedFormula {
    const frame = ComponentFrame.#frames.get(component);

    verify?.(
      frame,
      isPresent,
      expected?.when("in Preact's _diff hook").as("a tracking frame"),
    );

    const end = frame.#end(subscription);
    ComponentFrame.#stack.pop();
    return end;
  }

  static unmount(component: InternalComponent): void {
    const frame = ComponentFrame.#frames.get(component);

    if (frame) {
      frame.#unmount();
    }
  }

  #active: InitializingTrackingFrame | null;
  #frame: FinalizedFormula | null;
  readonly #tag: FormulaTag;
  #subscription: Unsubscribe | null;

  private constructor(
    frame: FinalizedFormula | null,
    active: InitializingTrackingFrame | null,
    subscribed: Unsubscribe | null,
    description: Description | undefined,
  ) {
    this.#frame = frame;
    this.#active = active;
    const tag = initializeFormulaTag(
      DEBUG?.Desc("formula", description),
      () => this.#frame?.children() ?? new Set(),
    );
    this.#tag = tag;
    this.#subscription = subscribed;
  }

  #start(): void {
    if (this.#frame) {
      this.#active = this.#frame.update();
    } else {
      this.#active = StartTrackingFrame();
    }
  }

  #end(subscription: (() => void) | undefined) {
    verify?.(
      this.#active,
      isPresent,
      expected?.when("in preact's _diff hook").as("an active tracking frame"),
    );

    const frame = (this.#frame = this.#active.done());
    RUNTIME.update(this.#tag);

    this.#active = null;

    if (subscription) {
      this.#subscription = render(this.#tag, subscription);
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
