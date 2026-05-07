// @vitest-environment jsdom

import { Marker } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { Cell } from "@starbeam/universal";
import {
  describe,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";
import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";

import SinkExperiment from "./fixtures/SinkExperiment.svelte";
import StoreExperiment from "./fixtures/StoreExperiment.svelte";
import ToggleExperiment from "./fixtures/ToggleExperiment.svelte";

const INITIAL_WIDTH = 0;

function html(element: Element): string {
  return element.innerHTML.replace(/>\s+</g, "><");
}

function ElementSizeForTest(
  events: RecordedEvents,
  marker: ReturnType<typeof Marker>,
) {
  return (element: HTMLElement) =>
    Resource(({ on }) => {
      const width = Cell(INITIAL_WIDTH);

      events.record("size:attached");

      on.sync(() => {
        events.record("size:sync");
        marker.read();
        width.set(Number(element.dataset["width"] ?? INITIAL_WIDTH));
      });

      on.finalize(() => {
        events.record("size:finalize");
      });

      return {
        get width() {
          return width.current;
        },
      };
    });
}

describe("Svelte element resource experiments", () => {
  test("callback sink publishes a domain-shaped value", async () => {
    const events = new RecordedEvents();
    const marker = Marker();
    const result = render(SinkExperiment, {
      props: { blueprint: ElementSizeForTest(events, marker) },
    });

    expect(html(result.container)).toBe(
      '<p>width=100</p><button>grow</button><div data-width="100">box</div>',
    );
    events.expect("size:attached", "size:sync");

    await fireEvent.click(result.getByRole("button", { name: "grow" }));
    expect(html(result.container)).toBe(
      '<p>width=100</p><button>grow</button><div data-width="101">box</div>',
    );
    events.expect();

    marker.mark();
    await tick();
    expect(html(result.container)).toBe(
      '<p>width=101</p><button>grow</button><div data-width="101">box</div>',
    );
    events.expect("size:sync");

    result.unmount();
    events.expect("size:finalize");
  });

  test("store sink publishes a domain-shaped value", async () => {
    const events = new RecordedEvents();
    const marker = Marker();
    const result = render(StoreExperiment, {
      props: { blueprint: ElementSizeForTest(events, marker) },
    });

    expect(html(result.container)).toBe(
      '<p>width=100</p><button>grow</button><div data-width="100">box</div>',
    );
    events.expect("size:attached", "size:sync");

    await fireEvent.click(result.getByRole("button", { name: "grow" }));
    expect(html(result.container)).toBe(
      '<p>width=100</p><button>grow</button><div data-width="101">box</div>',
    );
    events.expect();

    marker.mark();
    await tick();
    expect(html(result.container)).toBe(
      '<p>width=101</p><button>grow</button><div data-width="101">box</div>',
    );
    events.expect("size:sync");

    result.unmount();
    events.expect("size:finalize");
  });

  test("callback sink clears on attachment unmount", async () => {
    const events = new RecordedEvents();
    const marker = Marker();
    const result = render(ToggleExperiment, {
      props: { blueprint: ElementSizeForTest(events, marker) },
    });

    expect(html(result.container)).toBe(
      '<p>width=100</p><button>hide</button><div data-width="100">box</div><!---->',
    );
    events.expect("size:attached", "size:sync");

    await fireEvent.click(result.getByRole("button", { name: "hide" }));
    expect(html(result.container)).toBe(
      "<p>pending</p><button>hide</button><!---->",
    );
    events.expect("size:finalize");

    marker.mark();
    await tick();
    events.expect();
  });
});
