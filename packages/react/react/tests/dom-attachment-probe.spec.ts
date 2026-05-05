// @vitest-environment jsdom

import { useResource } from "@starbeam/react";
import { Marker, Resource } from "@starbeam/universal";
import {
  act,
  html,
  react,
  testReact,
} from "@starbeam-workspace/react-test-utils";
import { expect, RecordedEvents } from "@starbeam-workspace/test-utils";
import { useCallback, useState } from "react";

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

testReact<void, AttachmentProbe["status"]>(
  "DOM attachment probe — invalidation does not sync before first sync",
  async (root, mode) => {
    const events = new RecordedEvents();
    const marker = Marker();

    const result = await root.render((state) => {
      const { ref, status } = useElementAttachmentProbeForTest(events, {
        invalidate: () => void marker.read(),
      });

      state.value(status);

      return react.fragment(html.p(status), html.div({ ref }, "box"));
    });

    await result.rerender();

    expect(result.value).toBe("attached");
    expect(result.innerHTML).toBe("<p>attached</p><div>box</div>");
    result.raw((element) => {
      expect(element.querySelector("div")?.dataset["starbeamAttachment"]).toBe(
        undefined,
      );
    });

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

    await act(() => {
      marker.mark();
    });

    events.expect([]);
    result.raw((element) => {
      expect(element.querySelector("div")?.dataset["starbeamAttachment"]).toBe(
        undefined,
      );
    });

    await result.unmount();

    events.expect("resource:finalize", "ref:cleanup");
  },
);
