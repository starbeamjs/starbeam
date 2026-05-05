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
    expect(result.innerHTML).toBe(
      '<p>attached</p><div data-starbeam-attachment="attached">box</div>',
    );

    // The attached resource's sync handler runs in passive effect timing after
    // the ref-driven render reaches `attached`.
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
          "resource:sync",
        );
      },
      loose: () => {
        events.expect(
          "resource:pending",
          "ref:attach",
          "resource:attached",
          "resource:sync",
        );
      },
    });

    await result.unmount();

    events.expect("resource:finalize", "ref:cleanup");
  },
);

testReact<void, AttachmentProbe["status"]>(
  "DOM attachment probe — first sync is bootstrapped after attachment",
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
    expect(result.innerHTML).toBe(
      '<p>attached</p><div data-starbeam-attachment="attached">box</div>',
    );
    result.raw((element) => {
      expect(element.querySelector("div")?.dataset["starbeamAttachment"]).toBe(
        "attached",
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
          "resource:sync",
        );
      },
      loose: () => {
        events.expect(
          "resource:pending",
          "ref:attach",
          "resource:attached",
          "resource:sync",
        );
      },
    });

    // After first sync, extra turns don't resync unless a tracked dependency
    // changes.
    await act(() => {});

    events.expect([]);
    result.raw((element) => {
      expect(element.querySelector("div")?.dataset["starbeamAttachment"]).toBe(
        "attached",
      );
    });

    await result.rerender();

    expect(result.value).toBe("attached");
    expect(result.innerHTML).toBe(
      '<p>attached</p><div data-starbeam-attachment="attached">box</div>',
    );
    events.expect([]);
    result.raw((element) => {
      expect(element.querySelector("div")?.dataset["starbeamAttachment"]).toBe(
        "attached",
      );
    });

    await act(() => {
      marker.mark();
    });

    events.expect("resource:sync");
    result.raw((element) => {
      expect(element.querySelector("div")?.dataset["starbeamAttachment"]).toBe(
        "attached",
      );
    });

    await result.unmount();

    events.expect("resource:finalize", "ref:cleanup");
  },
);
