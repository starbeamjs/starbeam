import type { Description } from "@starbeam/interfaces";
import { useReactive } from "@starbeam/react";
import { CachedFormula, DEBUG } from "@starbeam/universal";

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

  return useReactive(({ on }) => {
    on.idle(() => {
      QUERIES.fetch(key).catch((e) => {
        console.error(e);
      });
    });

    return CachedFormula(() => {
      DEBUG?.markEntryPoint({
        caller: desc?.caller,
        description: desc
          ? {
              description: desc,
              operation: "current",
            }
          : "useQuery->current",
      });
      return QUERIES.query(key, query, desc).asData();
    });
  }, []);
}
