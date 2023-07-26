// @vitest-environment jsdom

import { setupService, Starbeam } from "@starbeam/vue";
import {
  describe,
  expect,
  resources,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { define, testing } from "@starbeam-workspace/vue-testing-utils";
import { defineComponent, h, type VNode } from "vue";

describe("services", () => {
  test("services are like resources", () => {
    function App() {
      const test = setupService(TestResource);
      return () => h("p", [test.value.id]);
    }

    const result = define({ setup: App }, Starbeam)
      .html(({ id }) => `<p>${id}</p>`, {
        id: resources.nextId,
      })
      .render();

    result.unmount();

    expect(resources.last.isActive).toBe(false);
  });

  const Inner = defineComponent({
    setup: () => {
      const test = setupService(TestResource);
      return () => h("p", ["inner: ", test.value.id]);
    },
  });

  test("a service is only instantiated once", async () => {
    function App(props: { id: number }): () => VNode[] {
      const test = setupService(TestResource);
      return () => [
        h("p", [`id prop: ${props.id}`]),
        h("p", [`outer: ${test.value.id}`]),
        h(Inner),
      ];
    }

    const result = testing({ id: Number })
      .define({ setup: App }, Starbeam)
      .html(
        ({ id }, { testId }) => {
          return `<p>id prop: ${id}</p><p>outer: ${testId}</p><p>inner: ${testId}</p>`;
        },
        {
          testId: 1,
        }
      )
      .render({ id: 1 });

    await result.rerender({ id: 2 }, { testId: 1 });

    result.unmount();

    expect(resources.last.isActive).toBe(false);
  });
});
