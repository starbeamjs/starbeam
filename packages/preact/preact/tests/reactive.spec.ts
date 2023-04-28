// @vitest-environment jsdom

import { install, setupReactive, useReactive } from "@starbeam/preact";
import { Cell } from "@starbeam/universal";
import { html, rendering } from "@starbeam-workspace/preact-testing-utils";
import { describe } from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll } from "vitest";

let nextId = 0;

describe("useReactive", () => {
  beforeAll(() => {
    install(options);
  });

  rendering.test(
    "baseline",
    function App({ name }: { name: string }) {
      return html`<div>hello ${name}</div>`;
    },
    (render) =>
      render
        .expect(({ name }) => html`<div>hello ${name}</div>`)
        .render({ name: "world" })
  );

  rendering.test(
    "passing a resource to useReactive",
    function App() {
      const { cell } = useReactive(({ use }) => use(ReactiveObject));

      return html`<p>${cell.current}</p>`;
    },
    (render) =>
      render
        .expect(({ count }: { count: number }) => html`<p>${count}</p>`)
        .render({ count: 0 })
  );

  rendering.test(
    "reactive values render",
    function App() {
      const { cell } = useReactive(ReactiveObject);

      return html`<p>${cell.current}</p>`;
    },
    (render) =>
      render
        .expect(({ count }: { count: number }) => html`<p>${count}</p>`)
        .render({ count: 0 })
  );

  rendering.test(
    "reactive values update",
    function App() {
      const { cell, increment } = useReactive(ReactiveObject);

      return html`<p>${cell}</p>
        <button onClick=${increment}>++</button>`;
    },
    (render) =>
      render
        .expect(
          ({ count }: { count: number }) =>
            html`<p>${count}</p>
              <button>++</button>`
        )
        .render({ count: 0 })
        .update(
          { count: 1 },
          { before: async (prev) => prev.find("button").fire.click() }
        )
  );
});

describe("setupReactive", () => {
  beforeAll(() => {
    install(options);
  });

  rendering.test(
    "passing a resource",
    function App() {
      const { cell } = setupReactive(({ use }) => use(ReactiveObject)).read();

      return html`<p>${cell.current}</p>`;
    },
    (render) =>
      render
        .expect(({ count }: { count: number }) => html`<p>${count}</p>`)
        .render({ count: 0 })
  );

  rendering.test(
    "reactive values render",
    function App() {
      const { cell } = setupReactive(ReactiveObject).read();

      return html`<p>${cell.current}</p>`;
    },
    (render) =>
      render
        .expect(({ count }: { count: number }) => html`<p>${count}</p>`)
        .render({ count: 0 })
  );

  rendering.test(
    "reactive values update",
    function App() {
      const { cell, increment } = setupReactive(ReactiveObject).read();

      return html`<p>${cell}</p>
        <button onClick=${increment}>++</button>`;
    },
    (render) =>
      render
        .expect(
          ({ count }: { count: number }) =>
            html`<p>${count}</p>
              <button>++</button>`
        )
        .render({ count: 0 })
        .update(
          { count: 1 },
          { before: async (prev) => prev.find("button").fire.click() }
        )
  );
});

const INITIAL_COUNT = 0;
const INCREMENT = 1;

function ReactiveObject(): { cell: Cell<number>; increment: () => void } {
  const cell = Cell(INITIAL_COUNT, {
    description: `ReactiveObject #${++nextId}`,
  });

  function increment(): void {
    cell.set(cell.current + INCREMENT);
  }

  return { cell, increment };
}
