/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// @vitest-environment jsdom

import { setupService } from "@starbeam/vue";
import { describe, test, TestResource } from "@starbeam-workspace/test-utils";
import { App, Define, renderApp } from "@starbeam-workspace/vue-testing-utils";
import { Fragment, h, shallowRef } from "vue";

describe("services", () => {
  test("services are like resources", async () => {
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

    const Inner = Define({}, () => {
      const test = setupService(TestResourceBlueprint);
      return () => h("p", ["inner count: ", test.count]);
    });

    const result = await renderApp(app, {
      events,
      output: ({ count, show }: { count: number; show: boolean }) => {
        if (show) {
          return `<p>hello id=${id}, count=${count}</p><button>++</button><button>hide</button><p>inner count: ${count}</p>`;
        } else {
          return `<p>hello id=${id}, count=${count}</p><button>++</button><button>show</button><!---->`;
        }
      },
    }).andExpect({
      output: { count: 0, show: true },
      events: ["setup", "sync"],
    });

    await result.rerender().andExpect("unchanged");

    invalidate();
    result.expect("unchanged");

    await result.flush().andExpect({ events: ["cleanup", "sync"] });

    await result.rerender().andExpect("unchanged");

    await result.click("++").andExpect({ output: { count: 1, show: true } });

    invalidate();
    result.expect("unchanged");
    await result.flush().andExpect({ events: ["cleanup", "sync"] });

    // removing a component that uses the service doesn't clean it up
    await result.click("hide").andExpect({ output: { count: 1, show: false } });

    // bringing it back doesn't set it up again
    await result.click("show").andExpect({ output: { count: 1, show: true } });

    await result.unmount().andExpect({
      events: ["cleanup", "finalize"],
    });
  });
});
