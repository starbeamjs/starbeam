import { Abstraction } from "@starbeam/debug";
import {
  FinalizedFrame,
  REACTIVE,
  TIMELINE,
  type DerivedInternals,
  type ReactiveInternals,
} from "@starbeam/timeline";
import { LOGGER } from "@starbeam/trace-internals";
import { exhaustive } from "@starbeam/verify";
import {
  InitializedDerivedInternalsImpl,
  UninitializedDerivedInternalsImpl,
} from "../internals/derived.js";
import type { ReactiveValue } from "../reactive.js";

export interface PolledMemo<T> {
  readonly value: T;
  readonly frame: FinalizedFrame<T>;
}

export class ReactiveMemo<T> implements ReactiveValue<T> {
  static create<T>(callback: () => T, description: string): ReactiveMemo<T> {
    return new ReactiveMemo(
      callback,
      UninitializedDerivedInternalsImpl.create(description)
    );
  }

  readonly #callback: () => T;
  #internal: DerivedInternals<T>;

  private constructor(callback: () => T, bookkeeping: DerivedInternals<T>) {
    this.#callback = callback;
    this.#internal = bookkeeping;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#internal;
  }

  get current(): T {
    if (this.#internal.state === "initialized") {
      const bookkeeping = this.#internal;
      const valid = bookkeeping.validate();

      if (valid.status === "valid") {
        return valid.value;
      }

      const { frame, value } = this.poll(
        bookkeeping.frame,
        bookkeeping.description
      );

      this.#internal = InitializedDerivedInternalsImpl.create(
        frame,
        bookkeeping.description
      );
      return value;
    } else {
      const bookkeeping = this.#internal;
      const { frame, value } = this.initialize(bookkeeping.description);

      this.#internal = InitializedDerivedInternalsImpl.create(
        frame,
        bookkeeping.description
      );
      return value;
    }
  }

  initialize(description: string): PolledMemo<T> {
    return LOGGER.trace.group(`initializing memo: ${description}`, () =>
      TIMELINE.withFrame(this.#callback, description)
    );
  }

  poll(frame: FinalizedFrame<T>, description: string): PolledMemo<T> {
    const validation = LOGGER.trace.group(`validating ${description}`, () => {
      const validation = frame.validate();

      switch (validation.status) {
        case "valid":
          LOGGER.trace.log(`=> valid frame`);
          break;
        case "invalid":
          LOGGER.trace.log(`=> invalid frame, recomputing`);
          break;
        default:
          exhaustive(validation, `validation.status`);
      }

      return validation;
    });

    if (validation.status === "valid") {
      return {
        value: validation.value,
        frame,
      };
    }

    return LOGGER.trace.group(`recomputing ${description}`, () =>
      TIMELINE.withFrame(this.#callback, description)
    );
  }
}

export function Memo<T>(
  callback: () => T,
  description = Abstraction.callerFrame()
): ReactiveMemo<T> {
  return ReactiveMemo.create(callback, description);
}

export type Memo<T> = ReactiveMemo<T>;
