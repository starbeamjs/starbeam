import { Stack } from "@starbeam/debug";
import {
  type MutableInternals,
  type ReactiveProtocol,
  REACTIVE,
  TX,
} from "@starbeam/timeline";

import { MutableInternalsImpl } from "../storage/mutable.js";

export class ReactiveMarker implements ReactiveProtocol {
  static create(internals: MutableInternalsImpl): ReactiveMarker {
    return new ReactiveMarker(internals);
  }

  readonly #internals: MutableInternalsImpl;

  private constructor(reactive: MutableInternalsImpl) {
    this.#internals = reactive;
  }

  freeze(): void {
    this.#internals.freeze();
  }

  consume(): void {
    this.#internals.consume();
  }

  update(): void {
    TX.batch(`updating ${this.#internals.description}`, () => {
      this.#internals.update();
    });
  }

  /** impl Reactive<T> */

  get [REACTIVE](): MutableInternals {
    return this.#internals;
  }
}

export function Marker(description = Stack.describeCaller()): ReactiveMarker {
  return ReactiveMarker.create(MutableInternalsImpl.create(description));
}

export type Marker = ReactiveMarker;
