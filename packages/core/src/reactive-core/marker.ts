import type { DescriptionArgs, DescriptionType } from "@starbeam/debug";
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

  consume(): void {
    this.#internals.consume();
  }

  update(): void {
    this.#internals.update();
  }

  /** impl Reactive<T> */

  get [REACTIVE](): MutableInternals {
    return this.#internals;
  }
}

export function Marker(description: DescriptionArgs): ReactiveMarker {
  return ReactiveMarker.create(MutableInternalsImpl.create(description));
}

Marker.described = (type: DescriptionType, args: DescriptionArgs) => {
  return ReactiveMarker.create(MutableInternalsImpl.described(type, args));
};

export type Marker = ReactiveMarker;
