import type { Description } from "@starbeam/interfaces";
import { useSetup } from "@starbeam/react";
import { DEBUG } from "@starbeam/universal";

import type { AsyncData, Query } from "./fetch.js";
import { QUERIES } from "./fetch.js";

export default function useQuery<T>(
  key: string,
  query: Query<T>,
  description?: string | Description
): AsyncData<T> {
  const desc = DEBUG?.Desc("resource", description, "useQuery")?.detail(
    "formula",
    "query",
    [key]
  );

  return useSetup(({ on }) => {
    on.idle(() => {
      QUERIES.fetch(key).catch((e) => {
        console.error(e);
      });
    }, desc?.implementation("resource", "on.idle", "on idle callback"));

    return () => {
      return QUERIES.query(key, query, desc).asData(DEBUG?.callerStack());
    };
  }, desc).compute();
}
