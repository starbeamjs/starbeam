import { Cell, type Reactive } from "@starbeam/core";
import js from "@starbeam/js";

class CacheEntry {
  static create(query: QueryFunction<unknown>): CacheEntry {
    const cell = Cell({ status: "loading" } as QueryResult);

    const controller = new AbortController();

    const entry = new CacheEntry(cell, controller, fetch);

    async function fetch() {
      try {
        const data = await Promise.resolve(
          query({ signal: controller.signal })
        );
        entry.#set(QueryResult.success(data));
      } catch (e) {
        entry.#set(QueryResult.error(e));
      }
    }

    return entry;
  }

  #result: Cell<QueryResult>;
  #controller: AbortController;
  #query: QueryFunction<unknown>;

  constructor(
    result: Cell<QueryResult>,
    controller: AbortController,
    query: QueryFunction<unknown>
  ) {
    this.#result = result;
    this.#controller = controller;
    this.#query = query;
  }

  start() {
    this.#query({ signal: this.#controller.signal });
  }

  abort() {
    this.#controller.abort();
  }

  get result(): Reactive<QueryResult> {
    return this.#result;
  }

  get isAborted() {
    return this.#controller.signal.aborted;
  }

  #set(value: QueryResult) {
    this.#result.set(value);
  }

  get isFailure() {
    switch (this.#result.current.status) {
      case "error":
        return true;
      case "success":
        return false;
      case "loading":
        // An aborted signal is asynchronously turned into an error, but we don't want to wait for
        // it to propagate to notice the error.
        //
        // This is important because a query can be cancelled during a microtask controlled by a
        // framework, followed by an immediate attempt to retry the query (for example, when React
        // 18 runs effects twice, the cleanup and subsequent setup happens without enough time to
        // intervene for the abort to turn into an error).
        return this.isAborted;
    }
  }
}

class QueryCache {
  #map: Map<string, CacheEntry> = js.Map("QueryCache");

  fetch<T>(
    key: Serializable,
    query: QueryFunction<T>
  ): Reactive<QueryResult<T>> {
    const serializedKey = serialize(key);

    const existing = this.#get(serializedKey);

    if (existing) {
      return existing.result as Reactive<QueryResult<T>>;
    } else {
      return this.#set(serializedKey, query).result as Reactive<QueryResult<T>>;
    }
  }

  #set<T>(key: string, query: QueryFunction<T>): CacheEntry {
    const entry = CacheEntry.create(query);
    this.#map.set(serialize(key), entry);

    return entry;
  }

  #get(key: string): CacheEntry | void {
    const serializedKey = serialize(key);

    const existing = this.#map.get(serializedKey);

    if (existing && !existing.isFailure) {
      return existing;
    }
  }

  start(key: Serializable) {
    const serializedKey = serialize(key);

    const existing = this.#get(serializedKey);

    if (existing) {
      void existing.start();
    }
  }

  abort(key: Serializable) {
    const serializedKey = serialize(key);

    const existing = this.#map.get(serializedKey);

    if (existing) {
      existing.abort();
    }
  }
}

export const QUERY_CACHE = new QueryCache();

export type QueryFunction<T> = (options: {
  signal: AbortSignal;
}) => PromiseLike<T>;

type QueryResultStatus<T, E = unknown> =
  | {
      status: "loading";
    }
  | {
      status: "success";
      data: T;
    }
  | {
      status: "error";
      data: E;
    };

class QueryResult<T = unknown, E = unknown> {
  static loading<T, E>(): QueryResult<T, E> {
    return new QueryResult({ status: "loading" });
  }

  static success<T, E>(data: T): QueryResult<T, E> {
    return new QueryResult<T, E>({ status: "success", data });
  }

  static error<T, E>(error: E): QueryResult<T, E> {
    return new QueryResult<T, E>({ status: "error", data: error });
  }

  constructor(readonly state: QueryResultStatus<T, E>) {}

  get status(): "loading" | "success" | "error" {
    return this.state.status;
  }

  isLoading(): boolean {
    return this.status === "loading";
  }

  isError(): boolean {
    return this.status === "error";
  }

  isSuccess(): boolean {
    return this.status === "success";
  }
}

export type FetchStatus = "fetching" | "paused" | "idle";

export type Serializable =
  | string
  | number
  | boolean
  | null
  | { [P in string]: Serializable }
  | Serializable[];

function serialize(value: Serializable): string {
  if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    return value.toString();
  } else if (typeof value === "boolean") {
    return value.toString();
  } else if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "[" + value.map(serialize).join(",") + "]";
  } else if (typeof value === "object") {
    if ("toJSON" in value && typeof value.toJSON === "function") {
      return serialize(value.toJSON());
    }

    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys.map((key) => `"${key}":${serialize(value[key])}`).join(",") +
      "}"
    );
  } else {
    throw new Error("Cannot serialize value");
  }
}
