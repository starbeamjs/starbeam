/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// @vitest-environment jsdom

import { install, setup } from "@starbeam/preact";
import { Cell } from "@starbeam/universal";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
  expect,
  test,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";

let nextId = 0;

describe("create", () => {
  beforeAll(() => void install(options));

  test("baseline", () => {
    function App({ name }: { name: string }) {
      return html`<div>hello ${name}</div>`;
    }

    const result = render(() => App({ name: "world" }));
    expect(result.innerHTML).toBe(`<div>hello world</div>`);
  });

  test("reactive values update", async () => {
    function App() {
      const { cell, increment } = setup(ReactiveObject);

      return html`<p>${cell.current}</p>
        <button
          onClick=${() => {
            increment();
          }}
        >
          ++
        </button>`;
    }

    const result = render(App);
    expect(result.innerHTML).toBe(`<p>0</p><button>++</button>`);

    await result.find("button").click();
    expect(result.innerHTML).toBe(`<p>1</p><button>++</button>`);
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
