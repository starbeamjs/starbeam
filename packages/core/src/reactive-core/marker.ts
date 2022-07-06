import type { Description, Stack } from "@starbeam/debug";
import {
  type MutableInternals,
  type ReactiveProtocol,
  REACTIVE,
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

  consume(caller: Stack): void {
    this.#internals.consume(caller);
  }

  update(): void {
    this.#internals.update();
  }

  /** impl Reactive<T> */

  get [REACTIVE](): MutableInternals {
    return this.#internals;
  }
}

export function Marker(description: Description): ReactiveMarker {
  return ReactiveMarker.create(MutableInternalsImpl.create(description));
}

export type Marker = ReactiveMarker;
