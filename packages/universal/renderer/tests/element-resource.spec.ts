// @vitest-environment jsdom

import { Cell, Marker } from "@starbeam/reactive";
import { setupElementResource } from "@starbeam/renderer";
import { Resource } from "@starbeam/resource";
import { describe, RecordedEvents, test } from "@starbeam-workspace/test-utils";

const INITIAL_WIDTH = 0;

function ElementSizeForTest(
  element: HTMLElement,
  events: RecordedEvents,
  marker: ReturnType<typeof Marker>,
) {
  return Resource(({ on }) => {
    const width = Cell(INITIAL_WIDTH);

    events.record("size:attached");

    on.sync(() => {
      events.record("size:sync");
      marker.read();
      width.set(Number(element.dataset["width"] ?? INITIAL_WIDTH));
    });

    on.lowLevel.finalize(() => {
      events.record("size:finalize");
    });

    return {
      get width() {
        return width.current;
      },
    };
  });
}

describe("setupElementResource", () => {
  test("sets up an element-backed resource and leaves scheduling to the caller", () => {
    const events = new RecordedEvents();
    const marker = Marker();
    const element = document.createElement("div");
    element.dataset["width"] = "100";

    const resource = setupElementResource(
      (element: HTMLElement) => ElementSizeForTest(element, events, marker),
      element,
    );

    events.expect("size:attached");
    resource.sync();
    events.expect("size:sync");

    element.dataset["width"] = "101";
    marker.mark();
    events.expect();

    resource.sync();
    events.expect("size:sync");

    resource.finalize();
    events.expect("size:finalize");
  });
});
