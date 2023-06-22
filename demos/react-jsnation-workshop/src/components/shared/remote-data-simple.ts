import reactive from "@starbeam/collections";
import { Resource, type ResourceBlueprint } from "@starbeam/universal";

import type { Async } from "./async.js";

/**
 * An implementation of abortable remote data as a Starbeam resource.
 *
 * This is a slightly simplified implementation of the version in
 * `remote-data.ts`, which has:
 *
 * - configurable error rates
 * - cache invalidation
 */
export function RemoteData<T>(url: string): ResourceBlueprint<Async<T>> {
  return Resource(({ on }) => {
    const data = reactive.object({ status: "loading", value: null as unknown });

    async function fetchData(signal: AbortSignal) {
      const result = await fetch(url, {
        signal: signal,
      });

      if (result.ok) {
        const json = (await result.json()) as T;

        data.status = "success";
        data.value = json;
      } else {
        data.status = "error";
        data.value = result.status;
      }
    }

    on.setup(() => {
      const controller = new AbortController();

      fetchData(controller.signal).catch((error) => {
        data.status = "error";
        data.value = error;
      });

      return () => void controller.abort();
    });

    return data as Async<T>;
  });
}
