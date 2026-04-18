/* eslint-disable @typescript-eslint/no-magic-numbers */
// @vitest-environment jsdom

import { useSyncReactive } from "../../src/experimental/use-sync-reactive.js";
import { Cell, Formula } from "@starbeam/universal";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";

const INITIAL = 0;
const STEP = 1;

testReact<void, number>(
  "useSyncReactive: external cell",
  async (root) => {
    const cell = Cell(INITIAL);

    const result = await root
      .expectHTML((value) => `<p>${value}</p><button>++</button>`)
      .render((state) => {
        const value = useSyncReactive(cell);
        state.value(value);

        return react.fragment(
          html.p(String(value)),
          html.button({ onClick: () => cell.current++ }, "++"),
        );
      });

    await result.find("button").fire.click();
  },
);

testReact<void, number>(
  "useSyncReactive: formula over external cell",
  async (root) => {
    const cell = Cell(INITIAL);
    const doubled = Formula(() => cell.current * 2);

    const result = await root
      .expectHTML((value) => `<p>${value}</p><button>++</button>`)
      .render((state) => {
        const value = useSyncReactive(doubled);
        state.value(value);

        return react.fragment(
          html.p(String(value)),
          html.button({ onClick: () => cell.current++ }, "++"),
        );
      });

    await result.find("button").fire.click();
    await result.find("button").fire.click();
  },
);

testReact<void, number>(
  "useSyncReactive: multiple increments trigger re-renders",
  async (root) => {
    const cell = Cell(INITIAL);

    const result = await root
      .expectHTML((value) => `<p>${value}</p><button>++</button>`)
      .render((state) => {
        const value = useSyncReactive(cell);
        state.value(value);

        return react.fragment(
          html.p(String(value)),
          html.button({ onClick: () => (cell.current += STEP) }, "++"),
        );
      });

    for (let i = 0; i < 5; i++) {
      await result.find("button").fire.click();
    }
  },
);
