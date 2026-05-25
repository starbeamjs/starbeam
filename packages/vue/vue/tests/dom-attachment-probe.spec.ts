// @vitest-environment jsdom

import { Marker } from "@starbeam/reactive";
import { Resource, setupResource } from "@starbeam/resource";
import { pushingScope, RUNTIME } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import { describe, RecordedEvents, test } from "@starbeam-workspace/test-utils";
import { App, renderApp } from "@starbeam-workspace/vue-testing-utils";
import type { Directive } from "vue";
import { Fragment, h, nextTick, withDirectives } from "vue";

interface AttachmentOptions {
  readonly invalidate?: (() => void) | undefined;
}

function ElementAttachmentForTest(
  element: HTMLElement,
  events: RecordedEvents,
  options: AttachmentOptions = {},
) {
  return Resource(({ on }) => {
    events.record("resource:attached");

    on.sync(() => {
      events.record("resource:sync");
      options.invalidate?.();
      element.dataset["starbeamAttachment"] = "attached";
    });

    on.lowLevel.finalize(() => {
      events.record("resource:finalize");
    });

    return { element };
  });
}

function elementResourceDirective(
  events: RecordedEvents,
  options: AttachmentOptions = {},
): Directive<HTMLElement> {
  const cleanups = new WeakMap<HTMLElement, () => void>();

  return {
    mounted(element) {
      const [scope, { sync }] = pushingScope(() =>
        setupResource(ElementAttachmentForTest(element, events, options)),
      );

      sync();

      let scheduled = false;
      const scheduleSync = () => {
        if (scheduled) return;
        scheduled = true;

        void nextTick(() => {
          scheduled = false;
          sync();
        });
      };

      const unsubscribe = RUNTIME.subscribe(sync, scheduleSync);

      cleanups.set(element, () => {
        if (unsubscribe) unsubscribe();
        finalize(scope);
      });
    },

    unmounted(element) {
      cleanups.get(element)?.();
      cleanups.delete(element);
    },
  };
}

describe("DOM attachment probe", () => {
  test("directive attaches an element-backed resource", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    const vElementResource = elementResourceDirective(events, {
      invalidate: () => void marker.read(),
    });

    const app = App({
      setup: () => {
        return () =>
          h(Fragment, [
            h("p", "attached"),
            withDirectives(h("div", "box"), [[vElementResource]]),
          ]);
      },
    });

    const expectedHTML =
      '<p>attached</p><div data-starbeam-attachment="attached">box</div>';

    const result = await renderApp(app, { events }).andExpect({
      output: expectedHTML,
      events: ["resource:attached", "resource:sync"],
    });

    await result.flush().andExpect({ output: expectedHTML });
    await result.rerender().andExpect({ output: expectedHTML });

    marker.mark();
    result.expect({ output: expectedHTML });

    await result.flush().andExpect({
      output: expectedHTML,
      events: ["resource:sync"],
    });
    await result
      .unmount()
      .andExpect({ output: "", events: ["resource:finalize"] });

    marker.mark();
    events.expect([]);
  });
});
