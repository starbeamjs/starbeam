// @vitest-environment jsdom

import { useReactive, useResource } from "@starbeam/react";
import { Cell, Marker } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import type { RenderState } from "@starbeam-workspace/react-test-utils";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "@starbeam-workspace/test-utils";

describe("resources running in stages", () => {
  testReact<void, number>("the basics", async (root, mode) => {
    const markers = {
      constructor: Marker("constructor"),
      setup: Marker("setup"),
    };

    const counts = { init: 0, finalized: 0, setup: 0, cleanup: 0 };

    function App(state: RenderState<number>) {
      const counter = useResource(testResource(counts, markers));
      return useReactive(() => {
        state.value(counter.current);

        // the resource should always be initialized
        expect(typeof counter.current).toBe("number");

        return react.fragment(
          html.div(counter.current),
          html.button({ onClick: () => counter.increment() }, "increment")
        );
      }, []);
    }

    const result = root
      .expectHTML((value) => `<div>${value}</div><button>increment</button>`)
      .render(App);

    mode.match({
      strict: () => {
        // strict mode initializes the resource:
        // - once during the throwaway render
        // - once during the throwaway effect
        // - once during the ultimate effect
        expect(counts.init, "init").toBe(3);
        // strict mode finalizes the resource:
        // - once when cleaning up the throwaway effect
        expect(counts.finalized, "finalized").toBe(1);
      },
      loose: () => {
        expect(counts.init).toBe(1);
        expect(counts.finalized).toBe(0);
      },
    });

    const initial = {
      init: counts.init,
      finalized: counts.finalized,
    };

    // Since the throwaway effect is not followed by a render, the
    // resource is never polled, and therefore its setup never occurs.
    // And since the setup never occurs, the associated cleanup never
    // occurs.
    //
    // As a result, both strict and loose mode only invoke the setup
    // lifecycle once, and neither mode invokes the cleanup lifecycle.
    expect(counts.setup, "setup").toBe(1);
    expect(counts.cleanup, "cleanup").toBe(0);

    expect(result.value).toBe(1);

    await result.find("button").fire.click();
    expect(result.value).toBe(2);

    markers.setup.mark();
    await result.rerender();
    expect(result.value).toBe(2);
    expect(counts.setup).toBe(2);
    expect(counts.cleanup).toBe(1);

    await result.find("button").fire.click();
    expect(result.value).toBe(3);

    markers.constructor.mark();
    await result.rerender();
    expect(result.value).toBe(3);
    expect(counts.setup).toBe(3);
    expect(counts.cleanup).toBe(2);
    expect(counts.init).toBe(initial.init + 1);
    expect(counts.finalized).toBe(initial.finalized + 1);
  });
});

interface Counts {
  init: number;
  finalized: number;
  setup: number;
  cleanup: number;
}

function testResource(
  counts: Counts,
  markers: { constructor: Marker; setup: Marker }
) {
  return Resource(({ on }) => {
    markers.constructor.read();
    counts.init++;
    const cell = Cell(0);
    const extra = Cell(0);

    on.setup(() => {
      console.log({ running: "setup" });
      markers.setup.read();
      extra.set(1);
      counts.setup++;
      return () => counts.cleanup++;
    });

    on.cleanup(() => {
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
