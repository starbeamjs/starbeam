 
 
 
// @vitest-environment jsdom

import { Cell } from "@starbeam/universal";
import { setupReactive, useReactive } from "@starbeam/vue";
import { describe, RecordedEvents, test } from "@starbeam-workspace/test-utils";
import { App, renderApp } from "@starbeam-workspace/vue-testing-utils";
import type { Ref } from "vue";
import { defineComponent, h } from "vue";

describe("create", () => {
  test("baseline", async () => {
    const app = App(() => () => h("div", ["hello ", "world"]));

    await renderApp(app).andExpect({ output: "<div>hello world</div>" });
  });

  test("reactive values render", async () => {
    const Counter = defineComponent({
      props: ["counter"],
      setup: (props: { counter: Ref<Counter> }) => {
        useReactive();
        return () => h("p", ["count: ", props.counter.value.count]);
      },
    });

    const events = new RecordedEvents();

    const obj = ReactiveObject(events);

    const app = App(() => {
      const counter = setupReactive(obj);

      return () => [
        h(Counter, { counter }),
        h(
          "button",
          { onClick: () => void counter.value.increment() },
          "increment",
        ),
      ];
    });

    const result = await renderApp(app, {
      output: (count: number) =>
        `<p>count: ${count}</p><button>increment</button>`,
      events,
    }).andExpect({ output: 0, events: ["setup", "get count"] });

    await result.rerender().andExpect("unchanged");

    await result
      .click()
      .andExpect({ output: 1, events: ["increment", "get count"] });

    await result.rerender().andExpect("unchanged");
    await result.unmount().andAssert();
  });
});

const INITIAL_COUNT = 0;
const INCREMENT = 1;

interface Counter {
  readonly count: number;
  readonly increment: () => void;
}

function ReactiveObject(events: RecordedEvents): () => Counter {
  return (): Counter => {
    const cell = Cell(INITIAL_COUNT);

    events.record("setup");

    const increment = () => {
      events.record("increment");
      return cell.set(cell.current + INCREMENT);
    };

    return {
      get count() {
        events.record("get count");
        return cell.current;
      },

      increment,
    };
  };
}
