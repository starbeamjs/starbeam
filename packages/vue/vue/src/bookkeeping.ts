import type { Reactive } from "@starbeam/interfaces";
import type { Handler } from "@starbeam/renderer";
import type { Ref } from "vue";

export class CopyRefs {
  readonly #refs = new Map<Ref<unknown>, Reactive<unknown>>();

  add(ref: Ref<unknown>, reactive: Reactive<unknown>): void {
    this.#refs.set(ref, reactive);
  }

  copy(): void {
    for (const [ref, reactive] of this.#refs) {
      ref.value = reactive.current;
    }
    this.#refs.clear();
  }
}

export class Handlers {
  readonly #handlers = new Set<Handler>();

  add(handler: Handler): void {
    this.#handlers.add(handler);
  }

  invoke(): void {
    for (const handler of this.#handlers) {
      handler();
    }
  }
}

interface OnHandlers {
  readonly mounted: Handlers;
  readonly layout: Handlers;
}

export class Lifecycle {
  readonly #handlers: OnHandlers = {
    mounted: new Handlers(),
    layout: new Handlers(),
  };

  readonly mounted = (handler: Handler): void =>
    void this.#handlers.mounted.add(handler);
  readonly layout = (handler: Handler): void =>
    void this.#handlers.layout.add(handler);

  run(kind: keyof OnHandlers): void {
    this.#handlers[kind].invoke();
  }
}
