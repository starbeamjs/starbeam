import { Cell } from "../reactive/cell.js";
import { Memo } from "../reactive/functions/memo.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";
import type { Timeline } from "../universe/timeline.js";

class ObjectCells {
  static initialize(key: PropertyKey, cell: Cell<unknown>): ObjectCells {
    let cells = new Map([[key, cell]]);
    return new ObjectCells(cells);
  }

  readonly #cells: Map<PropertyKey, Cell<unknown>>;

  private constructor(cells: Map<PropertyKey, Cell<unknown>>) {
    this.#cells = cells;
  }

  has(key: PropertyKey): boolean {
    return this.#cells.has(key);
  }

  initialize(key: PropertyKey, cell: Cell<unknown>) {
    this.#cells.set(key, cell);
  }

  get(key: PropertyKey): Cell<unknown> | null {
    return this.#cells.get(key) || null;
  }
}

class Cells {
  readonly #cells: WeakMap<object, ObjectCells> = new WeakMap();

  set(object: object, key: PropertyKey, cell: Cell<unknown>): void {
    let cells = this.#cells.get(object);

    if (cells) {
      if (!cells.has(key)) {
        cells.initialize(key, cell);
      }
    } else {
      this.#cells.set(object, ObjectCells.initialize(key, cell));
    }
  }

  get(object: object, key: PropertyKey): Cell<unknown> | null {
    return this.#cells.get(object)?.get(key) ?? null;
  }
}

export const CELLS = new Cells();

export function scopedReactive(timeline: Timeline): PropertyDecorator {
  return ((_target: object, key: symbol | string): PropertyDescriptor => {
    let cell = Cell.create<unknown>(
      undefined,
      timeline,
      `@reactive ${String(key)}`
    );

    return {
      enumerable: true,
      configurable: true,
      get: function () {
        return cell.current;
      },
      set: function (value) {
        CELLS.set(this, key, cell);
        cell.update(value);
      },
    };
  }) as unknown as PropertyDecorator;
}

export function scopedCached(timeline: Timeline): PropertyDecorator {
  return ((
    _target: object,
    key: symbol | string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    const { get, enumerable, configurable } = descriptor;

    verify(
      get,
      is.Present,
      expected(`the target of @cached`)
        .toBe(`a getter`)
        .butGot(() =>
          typeof descriptor.value === "function" ? `a method` : `a field`
        )
    );

    const CACHED = new WeakMap();

    return {
      enumerable,
      configurable,

      get: function () {
        let memo = CACHED.get(this);

        if (!memo) {
          memo = Memo.create(
            () => get.call(this),
            timeline,
            `computing ${String(key)}`
          );
          CACHED.set(this, memo);
        }

        return memo.current;
      },
    };
  }) as unknown as PropertyDecorator;
}
