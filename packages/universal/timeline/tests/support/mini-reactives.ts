import {
  callerStack,
  Desc,
  descriptionFrom,
  type Stack,
} from "@starbeam/debug";
import type { ReactiveCell, ReactiveValue, Tagged } from "@starbeam/interfaces";
import { TAG, type UNINITIALIZED } from "@starbeam/shared";
import { CellTag, StaticTag } from "@starbeam/tags";
import { diff, Frame, TIMELINE } from "@starbeam/timeline";

export interface FreezableCell<T> extends ReactiveCell<T> {
  freeze: () => void;
}

export type Cell<T> = ReactiveCell<T>;

class CellImpl<T> implements ReactiveCell<T> {
  readonly [TAG]: CellTag;
  #value: T;

  constructor(value: T) {
    this[TAG] = CellTag.create(Desc("cell"));
    this.#value = value;
  }

  read(caller = callerStack()): T {
    TIMELINE.didConsumeCell(this, caller);
    return this.#value;
  }
  get current(): T {
    return this.read(callerStack());
  }
  set current(newValue: T) {
    this.#value = newValue;

    this[TAG].lastUpdated = TIMELINE.bump(this[TAG], callerStack());
  }
}

export function Cell<T>(value: T): CellImpl<T> {
  return new CellImpl(value);
}

class FreezableCellImpl<T> implements ReactiveCell<T> {
  readonly [TAG]: CellTag;
  #value: T;
  constructor(value: T) {
    this[TAG] = CellTag.create(Desc("cell"));

    this.#value = value;
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

    TIMELINE.bump(this[TAG], callerStack());
  }

  freeze(): void {
    this[TAG].freeze();
  }
}

export function FreezableCell<T>(value: T): FreezableCellImpl<T> {
  return new FreezableCellImpl(value);
}

export function Static<T>(value: T): ReactiveValue<T> {
  return {
    [TAG]: StaticTag.create(Desc("static")),
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
  const tag = CellTag.create(Desc("cell"));

  return {
    instance: {
      [TAG]: tag,
    },
    update: () => {
      TIMELINE.bump(tag, callerStack());
    },
  };
}
