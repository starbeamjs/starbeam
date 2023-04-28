// @vitest-environment jsdom

import { Cell } from "@starbeam/universal";
import { setupReactive, useReactive } from "@starbeam/vue";
import { describe, test } from "@starbeam-workspace/test-utils";
import { define, testing } from "@starbeam-workspace/vue-testing-utils";
import { defineComponent, h, type Ref } from "vue";

describe("create", () => {
  test("baseline", () => {
    function App({ name }: { name: string }) {
      return h("div", ["hello ", name]);
    }

    testing({ name: String })
      .define(App)
      .html((props) => `<div>hello ${props.name}</div>`)
      .render({ name: "world" });
  });

  test("reactive values render", async () => {
    const Counter = defineComponent({
      props: ["counter"],
      setup: (props: { counter: Ref<Counter> }) => {
        useReactive();
        return () => h("p", ["count: ", props.counter.value.count]);
      },
    });

    function App() {
      const counter = setupReactive(ReactiveObject);

      return () => [
        h(Counter, { counter }),
        h(
          "button",
          { onClick: () => void counter.value.increment() },
          "increment"
        ),
      ];
    }

    const result = define({
      setup: App,
    })
      .html(({ count }) => `<p>count: ${count}</p><button>increment</button>`, {
        count: 0,
      })
      .render();

    await result.update(async () => result.find("button").fire.click(), {
      count: 1,
    });
  });
});

const INITIAL_COUNT = 0;
const INCREMENT = 1;

interface Counter {
  readonly count: number;
  readonly increment: () => void;
}

function ReactiveObject() {
  const cell = Cell(INITIAL_COUNT);

  const increment = () => {
    return cell.set(cell.current + INCREMENT);
  };

  return {
    get count() {
      return cell.current;
    },

    increment,
  };
}

// const ReactiveObject = Resource((): Counter => {
//   const cell = Cell(INITIAL_COUNT);

//   const increment = () => {
//     return cell.set(cell.current + INCREMENT);
//   };

//   return {
//     get count() {
//       return cell.current;
//     },

//     increment,
//   };
// });

// function ReactiveObject(): { cell: Cell<number>; increment: () => void } {
//   const cell = Cell(INITIAL_COUNT, {
//     description: `ReactiveObject #${++nextId}`,
//   });

//   function increment(): void {
//     cell.set(cell.current + INCREMENT);
//   }

//   return { cell, increment };
// }
