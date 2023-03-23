import { isObject } from "@starbeam/core-utils";
import {
  callerStack,
  type Description,
  descriptionFrom,
  DisplayStruct,
  type Stack,
} from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { ReactiveValue } from "@starbeam/interfaces";
import { UNINITIALIZED } from "@starbeam/shared";
import { CellTag } from "@starbeam/tags";
import { TAG, TIMELINE } from "@starbeam/timeline";

export interface CellPolicy<T, U = T> {
  equals: (a: T, b: T) => boolean;
  map: (value: T) => U;
}

export type Equality<T> = (a: T, b: T) => boolean;

const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class ReactiveCell<T> implements ReactiveValue<T, interfaces.CellTag> {
  static create<T>(
    value: T,
    tag: CellTag,
    equals: Equality<T> = Object.is
  ): ReactiveCell<T> {
    return new ReactiveCell(value, equals, tag);
  }

  #value: T;
  readonly #equals: Equality<T>;
  readonly [TAG]: CellTag;

  declare [INSPECT]: () => object;

  private constructor(value: T, equals: Equality<T>, tag: CellTag) {
    this.#value = value;
    this.#equals = equals;

    this[TAG] = tag;

    if (import.meta.env.DEV) {
      this[INSPECT] = (): object => {
        const { description, lastUpdated } = this[TAG];

        const desc = ` (${description.describe()})`;

        return DisplayStruct(`Cell${desc}`, {
          value: this.#value,
          updated: lastUpdated,
        });
      };

      Object.defineProperty(this, TAG, {
        writable: false,
      });

      Object.defineProperty(this, "toString", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: (): string => `Cell (${String(this.#value)})`,
      });
    }
  }

  freeze(): void {
    this[TAG].freeze();
  }

  get current(): T {
    return this.read(callerStack());
  }

  set current(value: T) {
    this.#set(value, callerStack());
  }

  read(caller = callerStack()): T {
    TIMELINE.didConsumeCell(this, caller);
    return this.#value;
  }

  /**
   * Returns true if the value was updated, and false if the value was already present and equal to
   * the new value.
   */
  set(value: T, caller = callerStack()): boolean {
    return this.#set(value, caller);
  }

  update(updater: (prev: T) => T, caller = callerStack()): boolean {
    return this.#set(updater(this.#value), caller);
  }

  initialize(initializer: () => T, caller = callerStack()): T {
    if (this.#value === UNINITIALIZED) {
      this.#set(initializer(), caller);
    }

    return this.#value;
  }

  #set(value: T, caller: Stack): boolean {
    if (this.#equals(this.#value, value)) {
      return false;
    }

    this.#value = value;
    this[TAG].update({ timeline: TIMELINE, stack: caller });
    return true;
  }
}

const INITIAL_INTERNAL_FRAMES = 0;

/**
 * The `equals` parameter is used to determine whether a new value is equal to
 * the current value. If `equals` returns `true` for a new value, the old value
 * remains in the cell and the cell's timestamp doesn't advance.
 *
 * It defaults to `Object.is` (`===` except that `Object.is(NaN, NaN)` is
 * `true`).
 * */

export function Cell<T>(
  value: T,
  description?:
    | string
    | { description?: string | Description; equals?: Equality<T> }
): Cell<T> {
  let desc: Description;
  let equals: Equality<T>;

  if (typeof description === "string" || description === undefined) {
    desc = normalize(description);
    equals = Object.is;
  } else {
    desc = normalize(description.description);
    equals = description.equals ?? Object.is;
  }

  return ReactiveCell.create(value, CellTag.create(desc), equals);
}

const CALLER_FRAME = 1;

function normalize(
  description: string | Description | undefined,
  internal = INITIAL_INTERNAL_FRAMES
): Description {
  if (typeof description === "string" || description === undefined) {
    return descriptionFrom(
      {
        type: "cell",
        api: {
          package: "@starbeam/universal",
          name: "Cell",
        },
        fromUser: description,
      },
      internal + CALLER_FRAME
    );
  }

  return description;
}

Cell.is = <T>(value: unknown): value is Cell<T> => {
  return isObject(value) && value instanceof ReactiveCell;
};

export type Cell<T = unknown> = ReactiveCell<T>;
