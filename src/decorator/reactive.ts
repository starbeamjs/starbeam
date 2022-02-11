import { Cell } from "../reactive/cell.js";
import { Memo } from "../reactive/functions/memo.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";

export const reactive: PropertyDecorator = (
  _target: object,
  key: symbol | string
): PropertyDescriptor => {
  let cell = Cell.create<unknown>(undefined, `@reactive ${String(key)}`);

  return {
    enumerable: true,
    configurable: true,
    get: function () {
      return cell.current;
    },
    set: function (value) {
      cell.update(value);
    },
  };
};

export const cached = <T>(
  _target: object,
  key: symbol | string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> => {
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
        memo = Memo.create(() => get.call(this), `computing ${String(key)}`);
        CACHED.set(this, memo);
      }

      return memo.current;
    },
  };
};
