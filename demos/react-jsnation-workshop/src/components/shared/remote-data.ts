import { reactive } from "@starbeam/collections";
import type { Marker, ResourceBlueprint } from "@starbeam/universal";
import { Resource } from "@starbeam/universal";

import type { Async, InvalidatableAsync } from "./async.js";

let errorCount = 0;

export function RemoteData<T>(
  url: string,
  options: { invalidate: Marker; errorRate?: number },
): ResourceBlueprint<InvalidatableAsync<T>>;
export function RemoteData<T>(
  url: string,
  options?: { errorRate?: number },
): ResourceBlueprint<Async<T>>;
export function RemoteData<T>(
  url: string,
  options?: { invalidate?: Marker; errorRate?: number },
): ResourceBlueprint<Async<T>> {
  return Resource(({ on }) => {
    const data = reactive.object({ status: "loading", value: null as unknown });

    async function fetchData(signal: AbortSignal) {
      await wait(1000);

      if (options?.errorRate) {
        // if the error rate is 0.25, then `1 / 0.25 = 4`, so
        // we'll hit an error once every 4 times.
        if (errorCount++ % (1 / options.errorRate) === 0) {
          data.status = "error";
          data.value = "404 not found";
          return;
        }
      }

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

    on.sync(() => {
      options?.invalidate?.read();
      const controller = new AbortController();

      fetchData(controller.signal).catch((error) => {
        data.status = "error";
        data.value = error;
      });

      return () => {
        const last = { ...data };
        data.status = "reloading";
        data.value = last;

        controller.abort();
      };
    });

    return data as Async<T>;
  });
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
