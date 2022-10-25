// @vitest-environment jsdom

import {
  type ResourceBlueprint,
  Cell,
  LIFETIME,
  Resource,
  Static,
} from "@starbeam/universal";
import { create, setup, use } from "@starbeam/preact";
import { html, rendering } from "@starbeam/preact-testing-utils";
import { isPresent, verified } from "@starbeam/verify";
import { describe } from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll, expect } from "vitest";

let id = 0;

describe("useReactive", () => {
  beforeAll(() => setup(options));

  rendering.test(
    "baseline",
    function App({ name }: { name: string }) {
      return html`<div>hello ${name}</div>`;
    },
    (render) =>
      render
        .html(({ name }) => html`<div>hello ${name}</div>`)
        .render({ name: "world" })
  );

  rendering.test(
    "reactive values render",
    function App() {
      const { cell } = create(ReactiveObject);
      return html`<p>${cell.current}</p>`;
    },
    (render) =>
      render.html(({ count }) => html`<p>${count}</p>`).render({ count: 0 })
  );

  rendering.test(
    "reactive values update",
    function App() {
      const { cell, increment } = create(ReactiveObject);

      return html`<p>${cell}</p>
        <button onClick=${increment}>++</button>`;
    },
    (render) =>
      render
        .html(
          ({ count }: { count: number }) =>
            html`<p>${count}</p>
              <button>++</button>`
        )
        .render({ count: 0 })
        .update(
          { count: 1 },
          { before: (prev) => prev.find("button").fire.click() }
        )
  );

  rendering.test(
    "resources are handled correctly",
    function App() {
      const test = use(TestResource);
      return html`<p>${test.id}</p>`;
    },
    (render) =>
      render
        .html(({ id }) => html`<p>${id}</p>`)
        .render({ id: TestResourceImpl.nextId })
        .unmount({
          after: () => {
            expect(TestResourceImpl.getLast().isActive).toBe(false);
          },
        })
  );
});

const TestResource: ResourceBlueprint<TestResourceImpl> = Resource((r) => {
  const impl = TestResourceImpl.create();

  r.on.cleanup(() => {
    LIFETIME.finalize(impl);
  });

  return Static(impl);
});

class TestResourceImpl {
  static #nextId = 0;
  static #last: TestResourceImpl | undefined;

  static get nextId(): number {
    return TestResourceImpl.#nextId;
  }

  static getLast(): TestResourceImpl {
    return verified(TestResourceImpl.#last, isPresent);
  }

  static create() {
    return new TestResourceImpl(TestResourceImpl.#nextId++);
  }

  #id: number;
  #active = true;

  constructor(id: number) {
    this.#id = id;
    TestResourceImpl.#last = this;

    LIFETIME.on.cleanup(this, () => {
      this.#active = false;
    });
  }

  get id() {
    return this.#id;
  }

  get isActive() {
    return this.#active;
  }
}

function ReactiveObject() {
  const cell = Cell(0, `ReactiveObject #${++id}`);

  function increment() {
    cell.set(cell.current + 1);
  }

  return { cell, increment };
}
