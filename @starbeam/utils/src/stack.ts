import { last } from "./array.js";

export interface StackFrame<T> {
  readonly isPopped: boolean;
  pop(): T;
}

export class FrameStack<T> {
  static create<T>(top: T): FrameStack<T> {
    return new FrameStack(top, []);
  }

  readonly #first: T;
  readonly #frames: T[];

  private constructor(top: T, frames: T[]) {
    this.#first = top;
    this.#frames = frames;
  }

  next(create: (prev: T) => T): StackFrame<T> {
    const value = create(this.current);
    return this.push(value);
  }

  push(value: T): StackFrame<T> {
    this.#frames.push(value);
    return this.#frame(value);
  }

  #frame(value: T): StackFrame<T> {
    let popped = false;

    return {
      get isPopped(): boolean {
        return popped;
      },
      pop: () => {
        if (popped === false) {
          popped = true;
        } else {
          throw Error(`You can only call pop() once for each push()`);
        }

        this.#frames.pop();
        return value;
      },
    };
  }

  get current(): T {
    return last(this.#frames) ?? this.#first;
  }
}
