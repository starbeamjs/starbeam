import { type Stack, callerStack, descriptionFrom } from "@starbeam/debug";
import type { MutableInternals } from "@starbeam/interfaces";
import { getID, type UNINITIALIZED } from "@starbeam/peer";
import { type Timestamp, diff } from "@starbeam/timeline";
import {
  type Reactive,
  type ReactiveProtocol,
  Frame,
  REACTIVE,
  TIMELINE,
  zero,
} from "@starbeam/timeline";

export interface Cell<T> extends ReactiveProtocol<MutableInternals> {
  current: T;
  read(stack: Stack): T;
}

export interface FreezableCell<T> extends Cell<T> {
  freeze(): void;
}

export function Cell<T>(value: T): Cell<T> {
  let lastUpdated = TIMELINE.next();
  const internals: MutableInternals = {
    type: "mutable",
    description: descriptionFrom({
      id: getID(),
      api: "Cell",
      type: "cell",
    }),
    get lastUpdated(): Timestamp {
      return lastUpdated;
    },
  };

  return {
    [REACTIVE]: internals,
    read(caller: Stack) {
      TIMELINE.didConsumeCell(this, caller);
      return value;
    },
    get current() {
      return this.read(callerStack());
    },
    set current(newValue: T) {
      value = newValue;

      lastUpdated = TIMELINE.bump(internals, callerStack());
    },
  };
}

export function FreezableCell<T>(value: T): FreezableCell<T> {
  let lastUpdated = zero();
  let isFrozen = false;
  const id = getID();

  const internals: MutableInternals = {
    type: "mutable",
    description: descriptionFrom({
      id: getID(),
      api: "FreezableCell",
      type: "cell",
    }),
    get lastUpdated(): Timestamp {
      return lastUpdated;
    },
    isFrozen: () => isFrozen,
  };

  return {
    [REACTIVE]: internals,
    read(caller: Stack) {
      TIMELINE.didConsumeCell(this, caller);
      return value;
    },
    get current() {
      return this.read(callerStack());
    },
    set current(newValue: T) {
      value = newValue;

      lastUpdated = TIMELINE.bump(internals, callerStack());
    },
    freeze() {
      isFrozen = true;
    },
  };
}

export function Static<T>(value: T): Reactive<T> {
  return {
    [REACTIVE]: {
      type: "static",
      description: descriptionFrom({
        id: getID(),
        api: "Static",
        type: "static",
      }),
    },
    read() {
      return value;
    },
  };
}

/**
 * A simplistic Formula implementation that we're using to test the fundamentals of the TIMELINE
 * API.
 */
export function Formula<T>(computation: () => T): {
  frame: Frame<T | UNINITIALIZED>;
  poll: () => T;
} {
  const frame = Frame.uninitialized<T>(
    TIMELINE.next(),
    descriptionFrom({
      type: "formula",
      id: getID(),
      api: "Formula",
    })
  );

  function poll(caller = callerStack()): T {
    const validation = frame.validate();

    if (validation.status === "valid") {
      TIMELINE.didConsumeFrame(frame, diff.empty(), caller);
      return validation.value;
    }

    const result = Frame.value(
      TIMELINE.frame.update({
        updating: frame,
        evaluate: computation,
      })
    );
    TIMELINE.update(frame);
    TIMELINE.didConsumeFrame(frame, diff.empty(), caller);
    return result;
  }

  return { frame, poll };
}

export function Marker(): {
  instance: ReactiveProtocol<MutableInternals>;
  update: () => void;
} {
  let lastUpdated = TIMELINE.next();
  const internals: MutableInternals = {
    type: "mutable",
    description: descriptionFrom({
      id: getID(),
      type: "cell",
      api: "Marker",
    }),
    get lastUpdated() {
      return lastUpdated;
    },
  };

  return {
    instance: {
      [REACTIVE]: internals,
    },
    update: () => {
      lastUpdated = TIMELINE.bump(internals, callerStack());
    },
  };
}
