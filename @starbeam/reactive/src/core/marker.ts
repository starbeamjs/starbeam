import { Abstraction } from "@starbeam/debug";
import { COORDINATOR } from "@starbeam/schedule";
import {
  REACTIVE,
  type MutableInternals,
  type ReactiveInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import { expected, isValue, verify } from "@starbeam/verify";
import { MutableInternalsImpl } from "../internals/mutable.js";

export class ReactiveMarker implements ReactiveProtocol {
  static create<T>(bookkeeping: MutableInternals): ReactiveMarker {
    return new ReactiveMarker(bookkeeping);
  }

  readonly #bookkeeping: MutableInternals;

  private constructor(reactive: MutableInternals) {
    this.#bookkeeping = reactive;
  }

  freeze(): void {
    this.#bookkeeping.freeze();
  }

  consume(): void {
    this.#bookkeeping.consume();
  }

  update(): void {
    this.#verifyMutable();

    const tx = COORDINATOR.begin(`updating ${this.#bookkeeping.description}`);
    this.#bookkeeping.update();
    tx.commit();
  }

  #verifyMutable() {
    verify(
      this.#bookkeeping.isFrozen(),
      isValue(false),
      expected(`a cell`)
        .toBe(`non-frozen`)
        .when(`updating a cell`)
        .butGot(() => `a frozen cell`)
    );
  }

  /** impl Reactive<T> */

  get [REACTIVE](): ReactiveInternals {
    return this.#bookkeeping;
  }
}

export function Marker(
  description = Abstraction.callerFrame()
): ReactiveMarker {
  return ReactiveMarker.create(MutableInternalsImpl.create(description));
}

export type Marker = ReactiveMarker;
