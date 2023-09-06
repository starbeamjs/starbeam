// @vitest-environment jsdom

import { setupService } from "@starbeam/vue";
import {
  describe,
  expect,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { App, Define, renderApp } from "@starbeam-workspace/vue-testing-utils";
import { Fragment, h, nextTick, shallowRef } from "vue";

describe("services", () => {
  test.only("services are like resources", async () => {
    const {
      resource: TestResourceBlueprint,
      id,
      events,
      invalidate,
    } = TestResource();

    const app = App(() => {
      const test = setupService(TestResourceBlueprint);
      const show = shallowRef(true);

      return () =>
        h(Fragment, [
          h("p", ["hello id=", test.id, ", count=", test.count]),
          h("button", { onClick: test.increment }, "++"),
          h(
            "button",
            { onClick: () => (show.value = !show.value) },
            show.value ? "hide" : "show",
          ),
          show.value ? h(Inner) : false,
        ]);
    });

    const Inner = Define(() => {
      const test = setupService(TestResourceBlueprint);
      return () => h("p", ["inner count: ", test.count]);
    });

    function html({ count, show }: { count: number; show: boolean }) {
      if (show) {
        return `<p>hello id=${id}, count=${count}</p><button>++</button><button>hide</button><p>inner count: ${count}</p>`;
      } else {
        return `<p>hello id=${id}, count=${count}</p><button>++</button><button>show</button><!---->`;
      }
    }

    const result = renderApp(app);
    expect(result.container.innerHTML).toBe(html({ count: 0, show: true }));
    events.expect("setup", "sync");

    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 0, show: true }));
    events.expect([]);

    invalidate();
    expect(result.container.innerHTML).toBe(html({ count: 0, show: true }));
    events.expect([]);

    await nextTick();
    expect(result.container.innerHTML).toBe(html({ count: 0, show: true }));
    events.expect("cleanup", "sync");

    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 0, show: true }));
    events.expect([]);

    (await result.findByRole("button", { name: "++" })).click();
    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 1, show: true }));
    events.expect([]);

    invalidate();
    expect(result.container.innerHTML).toBe(html({ count: 1, show: true }));
    events.expect([]);

    await nextTick();
    expect(result.container.innerHTML).toBe(html({ count: 1, show: true }));
    events.expect("cleanup", "sync");

    // removing a component that uses the resource doesn't clean it up
    (await result.findByRole("button", { name: "hide" })).click();
    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 1, show: false }));
    events.expect([]);

    // bringing it back doesn't set it up again
    (await result.findByRole("button", { name: "show" })).click();
    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 1, show: true }));
    events.expect([]);

    result.unmount();
    events.expect("cleanup", "finalize");
  });
});
