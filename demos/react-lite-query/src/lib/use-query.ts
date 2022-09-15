import {
  type Description,
  callerStack,
  descriptionFrom,
} from "@starbeam/debug";
import { useReactiveSetup } from "@starbeam/react";

import type { AsyncData, Query } from "./fetch.js";
import { QUERIES } from "./fetch.js";

export default function useQuery<T>(
  key: string,
  query: Query<T>,
  description?: string | Description
): AsyncData<T> {
  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam-demos/react-lite-query",
      name: "useQuery",
    },
    fromUser: description ?? "QUERIES",
  }).detail("query", [key]);

  return useReactiveSetup((setup) => {
    setup.on.idle(() => {
      QUERIES.fetch(key).catch((e) => {
        console.error(e);
      });
    }, desc.implementation("on.idle", { reason: "on.idle" }));

    return () => {
      return QUERIES.query(key, query, desc).asData(callerStack());
    };
  }, desc);
}
