// @vitest-environment jsdom

import { useElementResource } from "@starbeam/react";
import { Cell, Marker, Resource } from "@starbeam/universal";
import {
  act,
  html,
  react,
  testReact,
} from "@starbeam-workspace/react-test-utils";
import { expect, RecordedEvents } from "@starbeam-workspace/test-utils";

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

    on.finalize(() => {
      events.record("resource:finalize");
    });

    return { width };
  });
}

testReact<void, "pending" | "attached">(
  "useElementResource attaches an element-backed resource",
  async (root, mode) => {
    const events = new RecordedEvents();
    const marker = Marker();

    const result = await root.render((state) => {
      const size = useElementResource((element: HTMLElement) =>
        ElementSizeForTest(element, events, marker),
      );

      state.value(size.status);

      return react.fragment(
        html.p(size.status),
        size.status === "attached"
          ? html.p(String(size.current.width.current))
          : null,
        html.div({ ref: size.ref }, "box"),
      );
    });

    await result.rerender();

    expect(result.value).toBe("attached");
    expect(result.innerHTML).toBe(
      '<p>attached</p><p>0</p><div data-starbeam-attachment="attached">box</div>',
    );

    mode.match({
      strict: () => {
        events.expect("resource:attached", "resource:sync");
      },
      loose: () => {
        events.expect("resource:attached", "resource:sync");
      },
    });

    await act(() => {});
    events.expect([]);

    await result.rerender();
    events.expect([]);

    await act(() => {
      marker.mark();
    });

    events.expect("resource:sync");

    await result.unmount();

    events.expect("resource:finalize");
  },
);
