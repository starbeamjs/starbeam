import { reactive } from "@starbeam/js";

export class Queries {
  readonly #queries = reactive.Map<string, { state: Async; query: Query }>();

  query<T>(key: string, query: () => Promise<T>): Async<T> {
    debugger;
    let result = this.#queries.get(key);

    if (!result) {
      result = { state: { status: "idle" }, query };
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

    if (result.state.status === "idle") {
      await result.query().then((data) => {
        this.#queries.set(key, {
          state: { status: "loaded", data },
          query: result.query,
        });
      });
    }
  }
}

export const QUERIES = new Queries();

export type Query<T = unknown> = () => Promise<T>;

export type Async<T = unknown> =
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
