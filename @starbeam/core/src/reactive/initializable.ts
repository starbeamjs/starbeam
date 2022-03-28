import { assert } from "@starbeam/debug";
import { Cell } from "@starbeam/reactive";
import {
  REACTIVE,
  type ReactiveInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import { Enum } from "@starbeam/utils";

export class Status<T> extends Enum("Uninitialized", "Initialized(T)")<T> {
  map<U>(callback: (value: T) => U): Status<U> {
    return this.match({
      Initialized: (value) => Status.Initialized(callback(value)),
      Uninitialized: () => Status.Uninitialized(),
    });
  }

  get(): T | null {
    return this.or(() => null);
  }

  or<U>(callback: () => U): T | U {
    return this.match({
      Initialized: (value) => value as T | U,
      Uninitialized: callback,
    });
  }
}

export class InitializableCell<T> implements ReactiveProtocol {
  static create<T>(): InitializableCell<T> {
    return new InitializableCell<T>(Cell(Status.Uninitialized()));
  }

  readonly #cell: Cell<Status<T>>;

  private constructor(cell: Cell<Status<T>>) {
    this.#cell = cell;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#cell[REACTIVE];
  }

  get current(): Status<T> {
    return this.#cell.current;
  }

  initialize(value: T): void {
    assert(
      this.#cell.current.matches("Uninitialized"),
      `You can only initialize an initializable cell once. It was already initialized`
    );

    this.#cell.set(Status.Initialized(value));
  }

  isInitialized(): boolean {
    return this.#cell.current.matches("Initialized");
  }
}

export function Initializable<T>(): InitializableCell<T> {
  return InitializableCell.create();
}

export type Initializable<T> = InitializableCell<T>;
