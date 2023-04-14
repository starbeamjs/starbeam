// @vitest-environment jsdom

import { create, setup } from "@starbeam/preact";
import { Cell } from "@starbeam/universal";
import { html, rendering } from "@starbeam-workspace/preact-testing-utils";
import { describe } from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll } from "vitest";

let nextId = 0;

describe("create", () => {
  beforeAll(() => {
    setup(options);
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
    "reactive values render",
    function App() {
      const { cell } = create(ReactiveObject);

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
      const { cell, increment } = create(ReactiveObject);

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
