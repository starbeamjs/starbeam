/* eslint-disable @typescript-eslint/no-magic-numbers */
// @vitest-environment jsdom

import { useReactive, useResource } from "@starbeam/react";
import type { RenderState } from "@starbeam-workspace/react-test-utils";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import {
  describeInDev,
  expect,
  TestResource,
} from "@starbeam-workspace/test-utils";

describeInDev("resources running in stages", () => {
  testReact<void, number>("the basics", async (root, mode) => {
    const { resource, events, invalidate } = TestResource();

    function App(state: RenderState<number>) {
      const counter = useResource(resource);
      return useReactive(() => {
        state.value(counter.count);

        // the resource should always be initialized
        expect(typeof counter.count).toBe("number");

        return react.fragment(
          html.div(counter.count),
          html.button({ onClick: () => void counter.increment() }, "increment"),
        );
      }, []);
    }

    const result = await root
      .expectHTML((value) => `<div>${value}</div><button>increment</button>`)
      .render(App);

    mode.match({
      strict: () => {
        events.expect(
          // sets up the resource
          "setup",
          // then throws it away and sets up the resource again
          "setup",
          // syncs the resource
          "sync",
          // immediately cleans up the resource
          "cleanup",
          // finalizes the resource (as if the component was unmounted)
          "finalize",
          // sets up the resource again
          "setup",
          // syncs the resource
          "sync",
        );
      },
      loose: () => {
        events.expect("setup", "sync");
      },
    });

    expect(result.value).toBe(0);

    await result.find("button").fire.click();
    expect(result.value).toBe(1);
    events.expect([]);

    invalidate();
    await result.rerender();
    expect(result.value).toBe(1);
    events.expect("cleanup", "sync");
  });
});
