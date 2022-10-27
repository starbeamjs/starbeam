import { getLast, isPresentArray } from "@starbeam/core-utils";

export class Context {
  readonly component = new ComponentContext();

  #app: object | undefined;
  #singletons = new SingletonContext();

  set app(app: object) {
    this.#app = app;
  }

  get app(): object {
    if (this.#app === undefined) {
      throw Error(
        "You are attempting to use a feature of Starbeam that depends on the application context, but no application context has been set."
      );
    }

    return this.#app;
  }

  hasApp(): boolean {
    return this.#app !== undefined;
  }

  create<Args extends unknown[], Ret>(
    key: object,
    constructor: (...args: Args) => Ret,
    ...args: Args
  ): Ret {
    return this.#singletons.create(key, constructor, ...args);
  }
}

class SingletonContext {
  #instances = new WeakMap<object, object>();

  create<Args extends unknown[], Ret>(
    key: object | undefined,
    constructor: (...args: Args) => Ret,
    ...args: Args
  ): Ret {
    if (key === undefined) {
      return constructor(...args);
    }

    let existing = this.#instances.get(key) as Ret | undefined;

    if (existing === undefined) {
      existing = constructor(...args);
      this.#instances.set(key, existing as object);
    }

    return existing;
  }
}

export class ComponentContext {
  readonly #stack: object[] = [];
  readonly #singleton = new SingletonContext();

  get current(): object {
    const current = this.#current;
    if (current === undefined) {
      throw Error(
        "You are attempting to use a feature of Starbeam that depends on the current component, but no component is currently active."
      );
    }
    return current;
  }

  get #current(): object | undefined {
    return getLast(this.#stack);
  }

  push(component: object): void {
    this.#stack.push(component);
  }

  pop(): void {
    this.#stack.pop();
  }

  exists(): boolean {
    return isPresentArray(this.#stack);
  }

  create<Args extends unknown[], Ret>(
    constructor: (...args: Args) => Ret,
    ...args: Args
  ): Ret {
    return this.#singleton.create(this.#current, constructor, ...args);
  }
}

export const CONTEXT = new Context();
