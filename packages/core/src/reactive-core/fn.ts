import { type Reactive, REACTIVE } from "@starbeam/timeline";

export interface ReactiveFn<T> extends Reactive<T> {
  (): T;
}

export function ReactiveFn<T>(reactive: Reactive<T>): ReactiveFn<T> {
  function Reactive() {
    return reactive.current;
  }

  Object.defineProperty(Reactive, REACTIVE, {
    configurable: true,
    get: () => reactive[REACTIVE],
  });

  Object.defineProperty(Reactive, "current", {
    configurable: true,
    get: () => reactive.current,
  });

  return Reactive as ReactiveFn<T>;
}

export interface GeneralCell<T, U = T> extends Reactive<U> {
  set(value: T): void;
  update(updater: (value: U) => T): void;
}

export interface CellFn<T, U> extends Reactive<T> {
  (): T;
  set input(value: T);
  update(updater: (value: U) => T): void;
}

export function CellFn<T, U>(reactive: GeneralCell<T, U>): CellFn<T, U> {
  function Cell() {
    return reactive.current;
  }

  Object.defineProperty(Cell, REACTIVE, {
    configurable: true,
    get: () => reactive[REACTIVE],
  });

  Object.defineProperty(Cell, "current", {
    configurable: true,
    get: () => reactive.current,
  });

  Object.defineProperty(Cell, "input", {
    configurable: true,
    set: (value: T) => reactive.set(value),
  });

  Cell.update = (updater: (value: U) => T) => reactive.update(updater);

  Object.defineProperty(Cell, "update", {
    enumerable: false,
  });

  return Cell as unknown as CellFn<T, U>;
}
