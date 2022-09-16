import { Cell, Freshness } from "@starbeam/core";
import { reactive } from "@starbeam/js";
import { CanceledError } from "axios";

import { type Serializable, serialize } from "./key.js";

interface Network {
  controller: AbortController;
  txid: number;
}

interface Status<T> {
  state: Cell<QueryResultState>;
  data: Cell<unknown | T>;
}

class CacheEntry<T> {
  static create<T>(query: QueryFunction<T>): CacheEntry<T> {
    const state = Cell("loading" as QueryResultState);
    const data = Cell(undefined as T | unknown);

    const entry = new CacheEntry<T>({ state: state, data }, fetch);

    async function fetch({ controller, txid }: Network) {
      try {
        const data = await query({ signal: controller.signal });

        entry.#update(txid, { state: "loaded", data });
      } catch (e) {
        if (e instanceof CanceledError) {
          const validity = entry.#update(txid, { state: "aborted" });
          if (validity === "current") entry.#freshness.expire();
        } else {
          entry.#update(txid, { state: "error", data: e });
        }
      }
    }

    return entry;
  }

  #query: (_network: Network) => void | Promise<void>;
  #freshness: Freshness = Freshness("CacheEntry#freshness");
  #status: Status<T>;
  #network: Network | undefined;

  constructor(
    status: Status<T>,
    query: (network: Network) => void | Promise<void>
  ) {
    this.#status = status;
    this.#query = query;
  }

  #update(
    txid: number,
    updates: { state: QueryResultState; data?: unknown | T }
  ): "current" | "expired" {
    if (this.#network?.txid !== txid) return "expired";

    this.#status.state.set(updates.state);

    if ("data" in updates) {
      this.#status.data.set(updates.data);
    }

    return "current";
  }

  fetch(txid: number): void {
    this.#network = { controller: new AbortController(), txid };

    this.#status.state.update((state) =>
      state === "loaded" || state === "reloading" ? "reloading" : "loading"
    );

    void Promise.resolve(this.#query(this.#network));
  }

  invalidate() {
    if (this.#network) {
      this.#network.controller.abort();
      this.#network = undefined;
    }
    this.#freshness.expire();
  }

  get result(): QueryResult<T> {
    switch (this.#status.state.current) {
      case "loading":
        return new LoadingQueryResult();
      case "aborted":
        return new AbortedQueryResult();
      case "error":
        return new ErrorQueryResult(this.#status.data.current);
      case "reloading":
      case "loaded": {
        return new LoadedQueryResult(
          this.#status.state.current,
          this.#status.data.current as T
        );
      }
    }
  }

  get needsFetch(): boolean {
    return this.#freshness.isStale;
  }
}

class QueryCache {
  #map: Map<string, CacheEntry<unknown>> = reactive.Map("QueryCache");
  #txid = 0;

  initialize<T>(key: Serializable, query: QueryFunction<T>): CacheEntry<T> {
    const serializedKey = serialize(key);

    let entry = this.#map.get(serializedKey);

    if (!entry) {
      entry = CacheEntry.create(query);
      this.#map.set(serializedKey, entry);
    }

    return entry as CacheEntry<T>;
  }

  fetch(key: Serializable) {
    const entry = this.#map.get(serialize(key));

    if (entry && entry.needsFetch) {
      void entry.fetch(this.#txid++);
    }
  }

  invalidate(key: Serializable) {
    this.#map.get(serialize(key))?.invalidate();
  }
}

export const QUERY_CACHE = new QueryCache();

export type QueryFunction<T> = (options: {
  signal: AbortSignal;
}) => PromiseLike<T>;

type QueryResultState =
  | "loading"
  | "loaded"
  | "reloading"
  | "error"
  | "aborted";

abstract class AbstractQueryResult {
  abstract readonly state: QueryResultState;

  get isLoading() {
    return this.state === "loading" || this.state === "reloading";
  }

  get isSuccess() {
    return this.state === "loaded" || this.state === "reloading";
  }

  get isError() {
    return this.state === "error";
  }

  get isAborted() {
    return this.state === "aborted";
  }
}

class LoadedQueryResult<T = unknown> extends AbstractQueryResult {
  constructor(readonly state: "loaded" | "reloading", readonly data: T) {
    super();
  }
}

class ErrorQueryResult<E = unknown> extends AbstractQueryResult {
  readonly state = "error";

  constructor(readonly data: E) {
    super();
  }
}

class LoadingQueryResult extends AbstractQueryResult {
  readonly state = "loading";
}

class AbortedQueryResult extends AbstractQueryResult {
  readonly state = "aborted";
}

export type QueryResult<T = unknown, E = unknown> =
  | LoadedQueryResult<T>
  | ErrorQueryResult<E>
  | LoadingQueryResult
  | AbortedQueryResult;

export type FetchStatus = "fetching" | "paused" | "idle";
