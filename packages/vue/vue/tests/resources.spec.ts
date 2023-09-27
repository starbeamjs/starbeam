/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// @vitest-environment jsdom

import { setupResource } from "@starbeam/vue";
import { describe, test, TestResource } from "@starbeam-workspace/test-utils";
import { App, HTML, renderApp } from "@starbeam-workspace/vue-testing-utils";
import { Fragment, h } from "vue";

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

    const result = await renderApp(app, {
      output: HTML(
        (count: number) =>
          `<p>hello id=${id}, count=${count}</p><button>+</button>`,
      ),
      events,
    }).andExpect({ output: 0, events: ["setup", "sync"] });

    await result.rerender().andExpect("unchanged");

    invalidate();
    result.expect("unchanged");

    await result.flush().andExpect({ events: ["cleanup", "sync"] });
    await result.rerender().andExpect("unchanged");
    await result.click().andExpect({ output: 1 });

    invalidate();
    result.expect("unchanged");

    await result.flush().andExpect({ events: ["cleanup", "sync"] });
    await result.unmount().andExpect({ events: ["cleanup", "finalize"] });
  });
});
