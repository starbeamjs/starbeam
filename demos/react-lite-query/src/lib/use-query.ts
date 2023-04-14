import type { Description } from "@starbeam/interfaces";
import { useSetup } from "@starbeam/react";
import { RUNTIME } from "@starbeam/runtime";

import type { AsyncData, Query } from "./fetch.js";
import { QUERIES } from "./fetch.js";

export default function useQuery<T>(
  key: string,
  query: Query<T>,
  description?: string | Description
): AsyncData<T> {
  const desc = RUNTIME.debug
    ?.desc("resource", description, "useQuery")
    ?.detail("formula", "query", [key]);

  return useSetup(({ on }) => {
    on.idle(() => {
      QUERIES.fetch(key).catch((e) => {
        console.error(e);
      });
    }, desc?.implementation("resource", "on.idle", "on idle callback"));

    return () => {
      return QUERIES.query(key, query, desc).asData(RUNTIME.callerStack?.());
    };
  }, desc).compute();
}
