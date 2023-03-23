import {
  callerStack,
  type Description,
  descriptionFrom,
} from "@starbeam/debug";
import type { Stack } from "@starbeam/interfaces";
import {
  REACTIVE,
  type SubscriptionTarget,
  TIMELINE,
} from "@starbeam/timeline";

import { MutableInternals, type MutableInternalsImpl } from "../storage.js";

export class ReactiveMarker implements SubscriptionTarget<MutableInternals> {
  static create(internals: MutableInternalsImpl): ReactiveMarker {
    return new ReactiveMarker(internals);
  }

  readonly #internals: MutableInternalsImpl;

  private constructor(reactive: MutableInternalsImpl) {
    this.#internals = reactive;
  }

  get [REACTIVE](): MutableInternals {
    return this.#internals;
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
}

export function Marker(description?: string | Description): ReactiveMarker {
  return ReactiveMarker.create(
    MutableInternals(
      descriptionFrom({
        type: "cell",
        api: {
          package: "@starbeam/universal",
          name: "Marker",
        },
        fromUser: description,
      })
    )
  );
}

export type Marker = ReactiveMarker;
