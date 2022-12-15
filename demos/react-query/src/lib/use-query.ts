import { Component } from "@starbeam/react";

import type { Serializable } from "./key.js";
import { type QueryFunction, type QueryResult, QUERY_CACHE } from "./query.js";

export function useQuery<T>(
  key: Serializable,
  query: QueryFunction<T>
): QueryResult<T> {
  return Component(({ on }) => {
    const entry = QUERY_CACHE.initialize(key, query);

    on.layout(() => {
      QUERY_CACHE.fetch(key);

      return () => {
        QUERY_CACHE.invalidate(key);
      };
    });

    return () => {
      return entry.result;
    };
  });
}
