import { Cell } from "@starbeam/core";
import { type Description, type Stack, callerStack } from "@starbeam/debug";
import { reactive } from "@starbeam/js";

export class Queries {
  readonly #queries = reactive.Map<string, { state: Async; query: Query }>(
    "query-cache"
  );

  query<T>(
    key: string,
    query: () => Promise<T>,
    description: Description
  ): Async<T> {
    let result = this.#queries.get(key);

    if (!result) {
      result = { state: Async.idle(description), query };
      this.#queries.set(key, result);
    }

    return result.state as Async<T>;
  }

  async fetch(key: string): Promise<void> {
    const result = this.#queries.get(key);

    if (!result) {
      throw Error(
        `You attempted to fetch a query (key = ${key}), but no query with that name was registered.`
      );
    }

    const state = result.state;
    if (state.is("idle")) {
      await result.query().then((data) => {
        this.#queries.set(key, {
          state: state.loaded(data),
          query: result.query,
        });
      });
    }
  }
}

export const QUERIES = new Queries();

export type Query<T = unknown> = () => Promise<T>;

interface Variant<T> {
  readonly selected: Cell<boolean>;
  readonly value: Cell<T | null>;
}

// function Variant<T>(selected: false): Variant<T>;
// function Variant<T extends void>(selected: true): Variant<T>;
// function Variant<T>(selected: true, value: T): Variant<T>;
// function Variant(selected: boolean, value?: unknown): Variant<unknown> {
//   return {
//     selected: Cell(selected),
//     value: Cell(value),
//   };
// }

function selected<T extends void>(description: Description): Variant<T>;
function selected<T>(value: T, description: Description): Variant<T>;
function selected(
  ...args: [Description] | [unknown, Description]
): Variant<unknown> {
  let value: unknown;
  let description: Description;

  if (args.length === 1) {
    value = undefined;
    description = args[0];
  } else {
    value = args[0];
    description = args[1];
  }

  return {
    selected: Cell(true, {
      description: description.implementation({ reason: "selected?" }),
    }),
    value: Cell(value, {
      description: description.implementation({ reason: "value" }),
    }),
  };
}

function deselected<T>(description: Description): Variant<T>;
function deselected(description: Description): Variant<unknown> {
  return {
    selected: Cell(false, {
      description: description.implementation({ reason: "selected?" }),
    }),
    value: Cell(null as unknown | null, {
      description: description.implementation({ reason: "value" }),
    }),
  };
}

const Variant = {
  selected,
  deselected,
};

interface AsyncStates<T> {
  idle: Variant<void>;
  loading: Variant<void>;
  loaded: Variant<T>;
  error: Variant<Error>;
}

export type AsyncData<T> =
  | {
      state: "idle";
    }
  | {
      state: "loading";
    }
  | {
      state: "loaded";
      data: T;
    }
  | {
      state: "error";
      error: Error;
    };

export class Async<T = unknown> {
  static idle<T>(description: Description): Async<T> {
    return new Async<T>(
      {
        idle: Variant.selected(description.key("idle")),
        loading: Variant.deselected(description.key("loading")),
        loaded: Variant.deselected(description.key("loaded")),
        error: Variant.deselected(description.key("error")),
      },
      "idle"
    );
  }

  readonly #states: AsyncStates<T>;
  #currentType: keyof AsyncStates<T>;

  constructor(states: AsyncStates<T>, current: keyof AsyncStates<T>) {
    this.#states = states;
    this.#currentType = current;
  }

  asData(caller: Stack): AsyncData<T> {
    switch (this.#currentType) {
      case "idle":
        return { state: "idle" };
      case "loading":
        return { state: "loading" };
      case "loaded":
        return {
          state: "loaded",
          data: this.#states.loaded.value.read(caller) as T,
        };
      case "error":
        return {
          state: "error",
          error: this.#states.error.value.read(caller) as Error,
        };
    }
  }

  #deselect(type: keyof AsyncStates<T>) {
    switch (type) {
      case "idle":
        this.#states.idle.selected.set(false);
        break;
      case "loading":
        this.#states.loading.selected.set(false);
        break;
      case "loaded":
        this.#states.loaded.selected.set(false);
        this.#states.loaded.value.set(null);
        break;
      case "error":
        this.#states.error.selected.set(false);
        this.#states.loaded.value.set(null);
        break;
    }
  }

  is<K extends keyof AsyncStates<T>>(
    type: K,
    caller: Stack = callerStack()
  ): this is K extends "loaded" ? { data: T } : this {
    return this.#states[type].selected.read(caller);
  }

  get data(): T | null {
    return this.#states.loaded.value.read(callerStack());
  }

  idle(): Async<T> {
    this.#deselect(this.#currentType);
    this.#states.idle.selected.set(true);
    this.#currentType = "idle";
    return this;
  }

  loading(): Async<T> {
    this.#deselect(this.#currentType);
    this.#states.loading.selected.set(true);
    this.#currentType = "loading";
    return this;
  }

  loaded(data: T): Async<T> {
    this.#deselect(this.#currentType);
    this.#states.loaded.value.set(data);
    this.#currentType = "loaded";
    return this;
  }

  error(error: Error): Async<T> {
    this.#deselect(this.#currentType);
    this.#states.error.value.set(error);
    this.#currentType = "error";
    return this;
  }
}

export type AsyncType<T = unknown> =
  | {
      status: "idle";
    }
  | {
      status: "loading";
    }
  | {
      status: "loaded";
      data: T;
    }
  | { status: "error"; reason: unknown };
