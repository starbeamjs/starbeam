// @vitest-environment jsdom

import { describe, test } from "@starbeam-workspace/test-utils";
import { App, Define, renderApp } from "@starbeam-workspace/vue-testing-utils";
import { h, ref } from "vue";

describe("useReactive", () => {
  test("baseline", async () => {
    const component = Define(
      { name: String },
      (props) => () => h("div", ["hello ", props.name]),
    );

    const app = App(() => () => h(component, { name: "world" }));

    await renderApp(app, {
      output: (name: string) => `<div>hello ${name}</div>`,
    }).andExpect({ output: "world" });
  });

  test("rerendering", async () => {
    const name = ref("world");

    const component = Define({}, () => () => h("div", ["hello ", name.value]));

    const app = App(() => () => h(component));

    const result = await renderApp(app, {
      output: (name: string) => `<div>hello ${name}</div>`,
    }).andExpect({
      output: "world",
    });

    name.value = "cruel world";
    await result.rerender().andExpect({ output: "cruel world" });
    await result.unmount().andAssert();
  });

  test("firing events", async () => {
    const component = Define(
      { name: String },
      {
        setup: (props) => {
          const counter = ref(0);

          return () =>
            h("div", [
              props.name,
              h("button", { onClick: () => counter.value++ }, "increment"),
              h("p", String(counter.value)),
            ]);
        },
      },
    );

    const app = App(() => () => h(component, { name: "Hello world" }));

    const result = await renderApp(app, {
      output: ({ name, counter }: { name: string; counter: number }) =>
        `<div>Hello ${name}<button>increment</button><p>${String(
          counter,
        )}</p></div>`,
    }).andExpect({ output: { name: "world", counter: 0 } });

    await result.click().andExpect({ output: { name: "world", counter: 1 } });
  });
});
