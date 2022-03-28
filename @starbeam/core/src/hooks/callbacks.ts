export type Callback<T = void, U = void> = (value: T) => U;

export class Callbacks<T = void, U = void> {
  static create<T = void, U = void>(): Callbacks<T, U> {
    return new Callbacks(new Set());
  }

  readonly #set: Set<Callback<T, U>>;

  private constructor(set: Set<Callback<T, U>>) {
    this.#set = set;
  }

  add(callback: Callback<T, U>): void {
    this.#set.add(callback);
  }

  remove(callback: Callback<T, U>): void {
    this.#set.delete(callback);
  }

  invoke(input: T) {
    for (const callback of this.#set) {
      callback(input);
    }
  }
}
