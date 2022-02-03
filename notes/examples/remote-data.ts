type DataState<T> =
  | {
      readonly discriminant: "loading";
    }
  | {
      readonly discriminant: "loaded";
      readonly value: T;
    }
  | {
      readonly discriminant: "error";
      readonly value: Error;
    };

class RemoteData<T> {
  @reactive current: DataState<T> = { discriminant: "loading" };

  // #controller: Siu

  constructor(hook: Hook, url: Reactive<string>) {
    let controller = new AbortController();
    this.#fetch(url.current, controller.signal);

    hook.onDestroy(() => controller.abort());
  }

  async #fetch(url: string, signal: AbortSignal) {
    try {
      let data = (await fetch(url, { signal })) as T;
      this.current = { type: "loaded", value: data };
    } catch (e) {
      this.current = { type: "error", reason: e };
    }
  }
}
