// @vitest-environment jsdom

import { useResource } from "@starbeam/react";
import { Resource } from "@starbeam/universal";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { expect, RecordedEvents } from "@starbeam-workspace/test-utils";
import { useCallback, useState } from "react";

interface AttachmentProbe {
  readonly ref: (element: HTMLDivElement | null) => void;
  readonly status: "pending" | "attached";
}

function useElementAttachmentProbeForTest(
  events: RecordedEvents,
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

testReact<void, AttachmentProbe["status"]>(
  "DOM attachment probe — React Strict Mode ref timing",
  async (root, mode) => {
    const events = new RecordedEvents();

    const result = await root.render((state) => {
      const { ref, status } = useElementAttachmentProbeForTest(events);

      state.value(status);

      return react.fragment(html.p(status), html.div({ ref }, "box"));
    });

    await result.rerender();

    expect(result.value).toBe("attached");
    expect(result.innerHTML).toBe("<p>attached</p><div>box</div>");

    // `resource:sync` is recorded above on purpose, but omitted here.
    // The attached resource's sync handler runs from `useScheduledHandler`'s
    // passive effect. This ref-driven render can reach `attached` after the
    // initial passive effect pass, and `handler.register(sync)` does not
    // schedule another pass by itself.
    //
    // If `resource:sync` starts appearing here, React/Starbeam timing changed
    // and this probe should be updated deliberately.
    mode.match({
      strict: () => {
        events.expect(
          "resource:pending",
          "resource:pending",
          "ref:attach",
          "ref:cleanup",
          "ref:attach",
          "resource:pending",
          "resource:attached",
        );
      },
      loose: () => {
        events.expect(
          "resource:pending",
          "ref:attach",
          "resource:attached",
        );
      },
    });

    await result.unmount();

    events.expect("resource:finalize", "ref:cleanup");
  },
);
