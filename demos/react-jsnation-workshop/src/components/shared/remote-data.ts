import { Cell, Resource, type ResourceBlueprint } from "@starbeam/universal";

import type { Async } from "./shared.js";

export function RemoteData<T>(url: string): ResourceBlueprint<Async<T>, void> {
  const data = Cell({ status: "loading" } as Async<T>);

  return Resource(({ on }) => {
    const controller = new AbortController();

    async function fetchData() {
      await wait(500);

      const result = await fetch(url, {
        signal: controller.signal,
      });

      const json = (await result.json()) as T;

      data.set({ status: "success", value: json });
    }

    fetchData().catch((error) => data.set({ status: "error", error }));

    on.cleanup(() => {
      data.set({ status: "reloading", value: data.current.value });
      controller.abort();
    });

    return data;
  });
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
