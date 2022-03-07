import type { browser } from "@domtree/flavors";
import { Hook, lifetime, reactive, subscribe, use } from "@starbeam/core";
import { JSDOM } from "jsdom";

class Rendezvous {
  #promise: Promise<void> | null = null;

  get signal(): Promise<void> {
    if (this.#promise === null) {
      this.#promise = Promise.resolve();
      this.#promise.then(() => {
        this.#promise = null;
      });
    }

    return this.#promise;
  }
}

const RENDEZVOUS = new Rendezvous();

interface ElementSize {
  readonly width: number;
  readonly height: number;
}

class FakeResizeObserver implements ElementSize {
  #width: number;
  #height: number;

  readonly #subscribers: Set<(size: ElementSize) => void> = new Set();

  constructor(width: number, height: number) {
    this.#width = width;
    this.#height = height;
  }

  subscribe(callback: (size: ElementSize) => void): () => void {
    this.#subscribers.add(callback);
    return () => {
      this.#subscribers.delete(callback);
    };
  }

  get width(): number {
    return this.#width;
  }

  set width(value: number) {
    this.#width = value;
    this.#schedule();
  }

  get height(): number {
    return this.#height;
  }

  set height(value: number) {
    this.#height = value;
    this.#schedule();
  }

  async #schedule() {
    await RENDEZVOUS.signal;

    for (const callback of this.#subscribers) {
      callback({ width: this.#width, height: this.#height });
    }
  }
}

function RectangleDescription(observer: FakeResizeObserver) {
  return Hook((hook) => {
    const desc = reactive(describe(observer));

    let unsubscribe = observer.subscribe((size) => {
      desc.current = describe(observer);
    });

    hook.onDestroy(unsubscribe);

    return desc;
  }, "RectangleDescription");

  function describe(size: ElementSize) {
    return `${observer.width}x${observer.height}`;
  }
}

{
  const observer = new FakeResizeObserver(0, 0);
  const rectangle = use(RectangleDescription(observer));

  rectangle.poll(); //?

  observer.width = 400;

  await RENDEZVOUS.signal;

  rectangle.poll(); //?
}

function RectangleComponent(node: browser.Text, observer: FakeResizeObserver) {
  return Hook((hook) => {
    const description = hook.use(RectangleDescription(observer));

    const subscription = subscribe(description, (description) => {
      const next = description.poll();

      if (next.matches("UnchangedValue")) {
        node.data = next.value;
      }
    });

    node.data = description.current;

    lifetime.link(hook, subscription);

    return reactive(undefined);
  }, "RectangleComponent");
}

{
  const dom = new JSDOM();
  const doc = dom.window.document;

  const textNode = doc.createTextNode("");

  const observer = new FakeResizeObserver(0, 0);

  const renderedText = use(RectangleComponent(textNode, observer));

  renderedText.poll();

  textNode.data; //?

  observer.width = 400;

  await RENDEZVOUS.signal;

  renderedText.poll();

  textNode.data; //?
}
