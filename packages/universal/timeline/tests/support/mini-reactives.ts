import {
  callerStack,
  Desc,
  descriptionFrom,
  type Stack,
} from "@starbeam/debug";
import type {
  CellTag,
  ReactiveCell,
  ReactiveValue,
} from "@starbeam/interfaces";
import { TAG, type UNINITIALIZED } from "@starbeam/shared";
import { type Tagged } from "@starbeam/timeline";
import { diff, Frame, TIMELINE, type Timestamp } from "@starbeam/timeline";

export interface FreezableCell<T> extends ReactiveCell<T> {
  freeze: () => void;
}

export type Cell<T> = ReactiveCell<T>;

class CellImpl<T> implements ReactiveCell<T> {
  readonly [TAG]: CellTag;
  #value: T;
  #lastUpdated: Timestamp;
  constructor(value: T, timestamp: Timestamp) {
    const lastUpdated = (): Timestamp => this.#lastUpdated;

    this[TAG] = {
      type: "mutable",
      description: Desc("cell"),
      get lastUpdated(): Timestamp {
        return lastUpdated();
      },
    };
    this.#value = value;
    this.#lastUpdated = timestamp;
  }

  read(caller: Stack): T {
    TIMELINE.didConsumeCell(this, caller);
    return this.#value;
  }
  get current(): T {
    return this.read(callerStack());
  }
  set current(newValue: T) {
    this.#value = newValue;

    this.#lastUpdated = TIMELINE.bump(this[TAG], callerStack());
  }
}

export function Cell<T>(value: T): CellImpl<T> {
  return new CellImpl(value, TIMELINE.next());
}

class FreezableCellImpl<T> implements ReactiveCell<T> {
  readonly [TAG]: CellTag;
  #isFrozen = false;
  #value: T;
  #lastUpdated: Timestamp;
  constructor(value: T, timestamp: Timestamp) {
    const lastUpdated = (): Timestamp => this.#lastUpdated;

    this[TAG] = {
      type: "mutable",
      description: Desc("cell"),
      get lastUpdated(): Timestamp {
        return lastUpdated();
      },
      isFrozen: () => this.#isFrozen,
    };
    this.#value = value;
    this.#lastUpdated = timestamp;
  }

  read(caller: Stack): T {
    TIMELINE.didConsumeCell(this, caller);
    return this.#value;
  }
  get current(): T {
    return this.read(callerStack());
  }
  set current(newValue: T) {
    this.#value = newValue;

    this.#lastUpdated = TIMELINE.bump(this[TAG], callerStack());
  }

  freeze(): void {
    this.#isFrozen = true;
  }
}

export function FreezableCell<T>(value: T): FreezableCellImpl<T> {
  return new FreezableCellImpl(value, TIMELINE.next());
}

export function Static<T>(value: T): ReactiveValue<T> {
  return {
    [TAG]: {
      type: "static",
      description: descriptionFrom({
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
      api: "Formula",
    })
  );

  function poll(caller = callerStack()): T {
    const validation = frame.validate();

    if (validation.status === "valid") {
      TIMELINE.didConsumeFrame(frame, diff.empty(), caller);
      return validation.value;
    }

    const result = Frame.value(frame.evaluate(computation, TIMELINE.frame));
    TIMELINE.update(frame);
    TIMELINE.didConsumeFrame(frame, diff.empty(), caller);
    return result;
  }

  return { frame, poll };
}

export function Marker(): {
  instance: Tagged<CellTag>;
  update: () => void;
} {
  let lastUpdated = TIMELINE.next();
  const internals: CellTag = {
    type: "mutable",
    description: descriptionFrom({
      type: "cell",
      api: "Marker",
    }),
    get lastUpdated() {
      return lastUpdated;
    },
  };

  return {
    instance: {
      [TAG]: internals,
    },
    update: () => {
      lastUpdated = TIMELINE.bump(internals, callerStack());
    },
  };
}
