// @vitest-environment jsdom

import { install, useResource } from "@starbeam/preact";
import { Marker } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";
import { createElement, Fragment, options } from "preact";
import { useCallback, useState } from "preact/hooks";
import { act } from "preact/test-utils";

interface AttachmentProbe {
  readonly ref: (element: HTMLDivElement | null) => void;
  readonly status: "pending" | "attached";
}

interface AttachmentProbeOptions {
  readonly invalidate?: (() => void) | undefined;
}

function useElementAttachmentProbeForTest(
  events: RecordedEvents,
  options: AttachmentProbeOptions = {},
): AttachmentProbe {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  const ref = useCallback(
    (next: HTMLDivElement | null) => {
      events.record(next ? "ref:attach" : "ref:cleanup");
      setElement(next);
    },
    [events],
  );

  const attachment = useResource(
    () =>
      Resource(({ on }) => {
        if (element === null) {
          events.record("resource:pending");

          return { status: "pending" as const };
        }

        events.record("resource:attached");

        on.sync(() => {
          events.record("resource:sync");
          options.invalidate?.();
          element.dataset["starbeamAttachment"] = "attached";
        });

        on.finalize(() => {
          events.record("resource:finalize");
        });

        return { status: "attached" as const };
      }),
    [element],
  );

  return { ref, status: attachment.status };
}

describe("DOM attachment probe", () => {
  beforeAll(() => void install(options));

  test("React-shaped resource helper attaches when Preact ref is a resource dep", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    function App() {
      const { ref, status } = useElementAttachmentProbeForTest(events, {
        invalidate: () => void marker.read(),
      });

      return createElement(
        Fragment,
        {},
        html`<p>${status}</p>`,
        createElement("div", { ref }, "box"),
      );
    }

    const result = render(App);

    result.rerender({});

    expect(result.innerHTML).toBe(
      `<p>attached</p><div data-starbeam-attachment="attached">box</div>`,
    );
    events.expect(
      "resource:pending",
      "ref:attach",
      "resource:attached",
      "resource:sync",
    );

    await act(() => {});
    events.expect([]);

    result.rerender({});
    events.expect([]);

    await act(() => {
      marker.mark();
    });

    events.expect("resource:sync");

    result.unmount();
    events.expect("resource:finalize", "ref:cleanup");
  });
});
