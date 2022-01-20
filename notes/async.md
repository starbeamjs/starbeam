Async data loading in a reactive framework presents two problems:

1. How to turn the asynchronous _process_ into synchronous _data_
2. How to establish asynchronous loading boundaries so that each piece of
   asynchronous data doesn't need its own UI to represent the loading process
   (i.e. how do you avoid "loading spinner hell"?)

Starcatcher presents a two-part solution:

## The Process is an Enumeration

```ts
class Async<T> extends Cases {
  Loading = choice.void;
  Error = choice.unknown;
  Data = choice.Data<T>
}

const Async = Cases(
  ["Loading"],
  ["Error", types.unknown],
  ["Data", types.Variable]
);

class RemoteData<T> {
  @reactive state: Async<T>;

  constructor(on, { url }) {
    let controller = new AbortController();
    let signal = controller.signal;

    on.destroy(() => controller.abort());

    this.#fetch(signal, url);
  }

  async #fetch(signal, url) {
    this.state = Async.Loading;

    try {
      let response = await fetchJSON(signal, url);
      this.state = Async.Data(response);
    } catch (e) {
      this.state = Async.Error(e);
    }
  }
}

async function fetchJSON<T>(signal: AbortSignal, url: string): T {
  let response = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw Error(
      `fetchJSON (url="${url}") failed: ${response.status} (${response.statusText})`
    );
  }

  return response.json() as T;
}
```

## Process Boundaries

To avoid loading spinner hell, you can establish a part of your application as
containing multiple instances of the same process.

```ts

```
