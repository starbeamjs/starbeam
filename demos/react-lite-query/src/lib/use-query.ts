import { useReactiveSetup } from "@starbeam/react";

import type { Async, Query } from "./fetch.js";
import { QUERIES } from "./fetch.js";

export default function useQuery<T>(key: string, query: Query<T>): Async<T> {
  return useReactiveSetup((setup) => {
    setup.on.idle(() => {
      QUERIES.fetch(key).catch((e) => {
        console.error(e);
      });
    });

    return () => {
      return QUERIES.query(key, query);
    };
  });
}
