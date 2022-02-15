import { builtin } from "../reactive/builtins/reactive.js";
import { ReactiveCell } from "../reactive/cell.js";
import { Memo } from "../reactive/functions/memo.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";
import type { InferReturn } from "../strippable/wrapper.js";

type BuiltinFunction = typeof builtin;

interface ReactiveDecorator {
  (target: object, key: symbol | string): void;
}

interface ReactiveFunction extends BuiltinFunction, ReactiveDecorator {}

export const reactive: ReactiveFunction = (
  target: unknown,
  key?: symbol | string
): InferReturn => {
  if (key === undefined) {
    return builtin(target as Parameters<BuiltinFunction>[0]);
  }

  let cell = ReactiveCell.create<unknown>(
    undefined,
    `@reactive ${String(key)}`
  );

  return {
    enumerable: true,
    configurable: true,
    get: function () {
      return cell.current;
    },
    set: function (value: unknown) {
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
