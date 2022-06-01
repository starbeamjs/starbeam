import { expected, isPresent, verify } from "@starbeam/verify";

import { Cell } from "./reactive-core/cell.js";
import { Formula } from "./reactive-core/formula/formula.js";

interface ReactiveDecorator {
  (target: object, key: symbol | string): void;
}

export const reactive: ReactiveDecorator = (
  target: unknown,
  key: PropertyKey,
  _descriptor?: object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const CELLS = new WeakMap<object, Cell>();

  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get: function (this: object) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cell: Cell<any> | undefined = CELLS.get(this);

      if (!cell) {
        cell = Cell(undefined, `@reactive ${String(key)}`);
        CELLS.set(this, cell);
      }

      return cell.current as unknown;
    },
    set: function (this: object, value: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cell: Cell<any> | undefined = CELLS.get(this);

      if (!cell) {
        cell = Cell(undefined, `@reactive ${String(key)}`);
        CELLS.set(this, cell);
      }

      cell.set(value);
    },
  });
};

export const cached = <T>(
  target: object,
  key: symbol | string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor: TypedPropertyDescriptor<any>
): void => {
  // const { get, enumerable = true, configurable = true } = descriptor;

  verify(
    // eslint-disable-next-line @typescript-eslint/unbound-method
    descriptor.get,
    isPresent,
    expected(`the target of @cached`)
      .toBe(`a getter`)
      .butGot(() =>
        typeof descriptor.value === "function" ? `a method` : `a field`
      )
  );

  const CACHED = new WeakMap<object, Formula<T>>();

  Object.defineProperty(target, key, {
    enumerable: descriptor.enumerable ?? true,
    configurable: descriptor.configurable ?? true,
    get: function (this: object) {
      let formula = CACHED.get(this);

      if (!formula) {
        formula = Formula(
          // eslint-disable-next-line
          () => (descriptor.get as any).call(this),
          `computing ${String(key)}`
        );
        CACHED.set(this, formula);
      }

      return formula.current;
    },
  });
};
