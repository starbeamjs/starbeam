// @vitest-environment jsdom

import { setupService, Starbeam } from "@starbeam/vue";
import {
  describe,
  expect,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { define, testing } from "@starbeam-workspace/vue-testing-utils";
import { defineComponent, h, type VNode } from "vue";

describe.todo("services", () => {
  test("services are like resources", () => {
    const { resource: TestResourceBlueprint, id, events } = TestResource();

    function App() {
      const test = setupService(TestResourceBlueprint);
      return () => h("p", [test.id]);
    }

    const result = define({ setup: App }, Starbeam)
      .html(({ id }) => `<p>${id}</p>`, {
        id,
      })
      .render();

    result.unmount();

    events.expect("setup");
  });

  const Inner = defineComponent({
    setup: () => {
      const test = setupService(TestResource);
      return () => h("p", ["inner: ", test.id]);
    },
  });

  test("a service is only instantiated once", async () => {
    function App(props: { id: number }): () => VNode[] {
      const test = setupService(TestResource);
      return () => [
        h("p", [`id prop: ${props.id}`]),
        h("p", [`outer: ${test.id}`]),
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
        },
      )
      .render({ id: 1 });

    await result.rerender({ id: 2 }, { testId: 1 });

    result.unmount();

    expect(resources.last.isActive).toBe(false);
  });
});
