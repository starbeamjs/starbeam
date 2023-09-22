// @vitest-environment jsdom

import { useReactive, useResource } from "@starbeam/react";
import type { Marker } from "@starbeam/reactive";
import { Cell } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
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

    console.log("invalidating");
    invalidate();
    console.log("rerendering");
    await result.rerender();
    console.log("rerendered");
    expect(result.value).toBe(1);
    events.expect("cleanup", "sync");

    // markers.sync.mark();
    // await result.rerender();
    // expect(result.value).toBe(2);
    // expect(counts.setup).toBe(2);
    // expect(counts.cleanup).toBe(1);

    // await result.find("button").fire.click();
    // expect(result.value).toBe(3);

    // markers.constructor.mark();
    // await result.rerender();
    // expect(result.value).toBe(3);
    // expect(counts.setup).toBe(3);
    // expect(counts.cleanup).toBe(2);
    // expect(counts.init).toBe(initial.init + 1);
    // expect(counts.finalized).toBe(initial.finalized + 1);
  });
});

interface Counts {
  init: number;
  finalized: number;
  setup: number;
  cleanup: number;
}

function testResource(counts: Counts, markers: { sync: Marker }) {
  return Resource(({ on }) => {
    counts.init++;
    const cell = Cell(0);
    const extra = Cell(0);

    on.sync(() => {
      markers.sync.read();
      extra.set(1);
      counts.setup++;
      return () => counts.cleanup++;
    });

    on.finalize(() => {
      counts.finalized++;
    });

    return {
      get current() {
        return cell.current + extra.current;
      },
      increment: () => cell.current++,
    };
  });
}
