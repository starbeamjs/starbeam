import { cell, Reactive } from "@starbeam/reactive";

// ANCHOR: RemoteData

type RemoteDataState<T> = "loading" | ["data", T] | ["error", unknown];

export function RemoteData<T>(url: string) {
  return Resource((resource): Reactive<RemoteDataState<T>> => {
    const result = cell("loading" as RemoteDataState<T>);

    const controller = new AbortController();
    resource.on.cleanup(() => controller.abort());

    fetch(url, { signal: controller.signal })
      .then((response) => response.json() as Promise<T>)
      .then((data) => {
        result.set(["data", data]);
      })
      .catch((error) => {
        result.set(["error", error]);
      });

    return result;
  });
}
// ANCHOR_END: RemoteData

function Resource(arg0: (resource: any) => any) {
  throw new Error("Function not implemented.");
}
