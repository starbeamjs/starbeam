import { expected, isPresent, verify } from "@starbeam/verify";

import { Cell } from "@starbeam/core/src/reactive-core/cell.js-core/cell.js";
import { Formula } from "@starbeam/core/src/reactive-core/formula/formula.jsla/formula.js";

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
