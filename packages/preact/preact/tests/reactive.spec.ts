/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// @vitest-environment jsdom

import { install, setupReactive, useReactive } from "@starbeam/preact";
import type { UseReactive } from "@starbeam/renderer";
import { Cell, Formula } from "@starbeam/universal";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
  expect,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";

import type { Component } from "./support/testing.js";

let nextId = 0;

describe("reactive", () => {
  beforeAll(() => {
    install(options);
  });

  const USE_REACTIVE = {
    name: "useReactive",
    setup: (setup: (cell: Cell<number>) => UseReactive<number>) => {
      const cell = Cell(0);
      return {
        increment: () => cell.current++,
        setup: () => {
          const reactive = useReactive(setup(cell), []);
          return {
            read: () => reactive,
          };
        },
      };
    },
  };

  const SETUP_REACTIVE = {
    name: "setupReactive",
    setup: (setup: (cell: Cell<number>) => UseReactive<number>) => {
      const cell = Cell(0);
      return {
        increment: () => cell.current++,
        setup: () => {
          const reactive = setupReactive(setup(cell));
          return {
            read: () => reactive,
          };
        },
      };
    },
  };

  describe.each([USE_REACTIVE, SETUP_REACTIVE])(
    "passing a reactive value to $name",
    ({ setup }) => {
      test.each([
        { name: "a cell", fn: (cell: Cell<number>) => cell },
        {
          name: "a function returning a cell",
          fn: (cell: Cell<number>) => () => cell,
        },
        {
          name: "a function returning a formula",
          fn: (cell: Cell<number>) => Formula(() => cell.current),
        },
      ])("passing $name", async ({ fn }) => {
        const use = setup(fn);

        function App() {
          const cell = use.setup();

          return html`<p>${cell.read()}</p>
            <button onClick=${use.increment}>++</button>`;
        }

        await expectReactive(App);
      });
    },
  );

  test("reactive values render and update", async () => {
    const counter = Cell(0);

    function App() {
      return html`<p>${counter}</p>
        <button
          onClick=${() => {
            return counter.current++;
          }}
        >
          ++
        </button>`;
    }

    await expectReactive(App);
  });

  async function expectReactive(app: Component) {
    const result = render(app);
    expect(result.innerHTML).toBe("<p>0</p><button>++</button>");

    await result.find("button").click();

    expect(result.innerHTML).toBe("<p>1</p><button>++</button>");
  }
});

describe("setupReactive", () => {
  beforeAll(() => void install(options));

  test("passing a resource", () => {
    const { resource, id } = TestResource();
    function App() {
      const { id } = setupReactive(({ use }) => use(resource)).read();
      return html`<p>${id}</p>`;
    }

    render(App).expect({ id }, ({ id }) => html`<p>${id}</p>`);
  });

  test("reactive values render", () => {
    function App() {
      const { cell } = setupReactive(ReactiveObject).read();
      return html`<p>${cell}</p>`;
    }

    render(App).expect(
      { count: 0 },
      ({ count }: { count: number }) => html`<p>${count}</p>`,
    );
  });
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
