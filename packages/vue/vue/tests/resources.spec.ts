// @vitest-environment jsdom

import { setupResource } from "@starbeam/vue";
import {
  describe,
  expect,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { App, renderApp } from "@starbeam-workspace/vue-testing-utils";
import { Fragment, h, nextTick } from "vue";

describe("resources", () => {
  test("resources are cleaned up correctly", async () => {
    const {
      resource: TestResourceBlueprint,
      id,
      events,
      invalidate,
    } = TestResource();

    const app = App(() => {
      const test = setupResource(TestResourceBlueprint);
      return () =>
        h(Fragment, [
          h("p", ["hello id=", test.id, ", count=", test.count]),
          h("button", { onClick: test.increment }, "+"),
        ]);
    });

    function html({ count }: { count: number }) {
      return `<p>hello id=${id}, count=${count}</p><button>+</button>`;
    }

    const result = renderApp(app);
    expect(result.container.innerHTML).toBe(html({ count: 0 }));
    events.expect("setup", "sync");

    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 0 }));
    events.expect([]);

    invalidate();
    expect(result.container.innerHTML).toBe(html({ count: 0 }));
    events.expect([]);

    await nextTick();
    expect(result.container.innerHTML).toBe(html({ count: 0 }));
    events.expect("cleanup", "sync");

    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 0 }));
    events.expect([]);

    (await result.findByRole("button")).click();
    await result.rerender({});
    expect(result.container.innerHTML).toBe(html({ count: 1 }));

    invalidate();
    expect(result.container.innerHTML).toBe(html({ count: 1 }));
    events.expect([]);

    await nextTick();
    expect(result.container.innerHTML).toBe(html({ count: 1 }));
    events.expect("cleanup", "sync");

    result.unmount();
    events.expect("cleanup", "finalize");
  });
});
