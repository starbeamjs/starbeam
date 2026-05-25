// @vitest-environment jsdom

import { install, useElementResource } from "@starbeam/preact";
import { Cell, Marker, Resource } from "@starbeam/universal";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";
import { createElement, Fragment, options } from "preact";
import { act } from "preact/test-utils";

const INITIAL_WIDTH = 0;

function ElementSizeForTest(
  element: HTMLElement,
  events: RecordedEvents,
  marker: ReturnType<typeof Marker>,
) {
  return Resource(({ on }) => {
    events.record("resource:attached");

    const width = Cell(INITIAL_WIDTH);

    on.sync(() => {
      events.record("resource:sync");
      marker.read();
      width.set(element.getBoundingClientRect().width);
      element.dataset["starbeamAttachment"] = "attached";
    });

    on.lowLevel.finalize(() => {
      events.record("resource:finalize");
    });

    return { width };
  });
}

describe("useElementResource", () => {
  beforeAll(() => void install(options));

  test("attaches an element-backed resource", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    function App() {
      const size = useElementResource((element: HTMLElement) =>
        ElementSizeForTest(element, events, marker),
      );

      return createElement(
        Fragment,
        {},
        html`<p>${size.status}</p>`,
        size.status === "attached"
          ? html`<p>${size.current.width.current}</p>`
          : null,
        createElement("div", { ref: size.ref }, "box"),
      );
    }

    const result = render(App);

    result.rerender({});

    expect(result.innerHTML).toBe(
      `<p>attached</p><p>0</p><div data-starbeam-attachment="attached">box</div>`,
    );
    events.expect("resource:attached", "resource:sync");

    await act(() => {});
    events.expect([]);

    result.rerender({});
    events.expect([]);

    await act(() => {
      marker.mark();
    });

    events.expect("resource:sync");

    result.unmount();
    events.expect("resource:finalize");
  });
});
