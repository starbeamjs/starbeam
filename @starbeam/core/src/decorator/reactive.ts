import type { InferReturn } from "@starbeam/fundamental";
import { expected, verify } from "@starbeam/verify";
import {
  builtin,
  type BuiltinDescription,
} from "../reactive/builtins/reactive.js";
import { ReactiveCell } from "../reactive/cell.js";
import { ReactiveMemo } from "../reactive/memo.js";
import { is } from "../strippable/minimal.js";

type BuiltinFunction = typeof builtin;

interface ReactiveDecorator {
  (target: object, key: symbol | string): void;
}

interface ReactiveFunction extends ReactiveDecorator, BuiltinFunction {}

export const reactive: ReactiveFunction = (
  target: unknown,
  key?: symbol | string | BuiltinDescription,
  descriptor?: object
): InferReturn => {
  if (descriptor === undefined) {
    return builtin(
      target as Parameters<BuiltinFunction>[0],
      key as Parameters<BuiltinFunction>[1]
    );
  }

  const cell = ReactiveCell.create<unknown>(
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
      cell.current = value;
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
    enumerable: true,
    configurable: true,

    get: function () {
      let memo = CACHED.get(this);

      if (!memo) {
        memo = ReactiveMemo.create(
          () => get.call(this),
          `computing ${String(key)}`
        );
        CACHED.set(this, memo);
      }

      return memo.current;
    },
  };
};
