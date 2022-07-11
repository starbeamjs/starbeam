import { useReactiveSetup } from "@starbeam/react";

import {
  type QueryFunction,
  type QueryResult,
  type Serializable,
  QUERY_CACHE,
} from "./query.js";

export function useQuery<T>(
  key: Serializable,
  query: QueryFunction<T>
): QueryResult<T> {
  return useReactiveSetup((setup) => {
    const running = QUERY_CACHE.fetch(key, query);

    setup.on.layout(() => {
      QUERY_CACHE.start(key);

      return () => {
        QUERY_CACHE.abort(key);
      };
    });

    return running;
  });
}
