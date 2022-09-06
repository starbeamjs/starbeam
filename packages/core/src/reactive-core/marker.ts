import {
  type Description,
  callerStack,
  descriptionFrom,
} from "@starbeam/debug";
import type { Stack } from "@starbeam/interfaces";
import { getID } from "@starbeam/peer";
import { type ReactiveProtocol, REACTIVE, TIMELINE } from "@starbeam/timeline";

import { type MutableInternalsImpl, MutableInternals } from "../storage.js";

export class ReactiveMarker implements ReactiveProtocol<MutableInternals> {
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

  consume(caller = callerStack()): void {
    TIMELINE.didConsumeCell(this, caller);
  }

  update(caller: Stack): void {
    this.#internals.update(caller);
  }

  /** impl Reactive<T> */

  get [REACTIVE](): MutableInternals {
    return this.#internals;
  }
}

export function Marker(description?: string | Description): ReactiveMarker {
  return ReactiveMarker.create(
    MutableInternals(
      descriptionFrom({
        type: "cell",
        id: getID(),
        api: {
          package: "@starbeam/core",
          name: "Marker",
        },
        fromUser: description,
      })
    )
  );
}

export type Marker = ReactiveMarker;
