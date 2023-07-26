// @vitest-environment jsdom

import { describe, test } from "@starbeam-workspace/test-utils";
import { testing } from "@starbeam-workspace/vue-testing-utils/src/testing.js";
import { h, ref } from "vue";

describe("useReactive", () => {
  test("baseline", () => {
    testing({ name: String })
      .define((props) => h("div", ["hello ", props.name]))
      .html((props) => `<div>hello ${props.name}</div>`)
      .render({ name: "world" });
  });

  test("rerendering", async () => {
    const result = testing({ name: String })
      .define((props) => h("div", ["hello ", props.name]))
      .html((props) => `<div>hello ${props.name}</div>`)
      .render({ name: "world" });

    await result.update(async () => result.rerender({ name: "cruel world" }));
  });

  test("firing events", async () => {
    const result = testing({ name: String })
      .define({
        setup: (props) => {
          const counter = ref(0);

          return () =>
            h("div", [
              props.name,
              h("button", { onClick: () => counter.value++ }, "increment"),
              h("p", String(counter.value)),
            ]);
        },
      })
      .html(
        (_, { counter }) =>
          `<div>Hello world<button>increment</button><p>${String(
            counter
          )}</p></div>`,
        { counter: 0 }
      )
      .render({ name: "Hello world" });

    await result.update(async () => result.find("button").fire.click(), {
      counter: 1,
    });
  });
});
