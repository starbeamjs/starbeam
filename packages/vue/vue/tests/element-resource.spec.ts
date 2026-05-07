// @vitest-environment jsdom

import { Marker } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { Cell } from "@starbeam/universal";
import { elementResource, elementResourceDirective } from "@starbeam/vue";
import { describe, RecordedEvents, test } from "@starbeam-workspace/test-utils";
import { App, renderApp } from "@starbeam-workspace/vue-testing-utils";
import { Fragment, h, shallowRef, withDirectives } from "vue";

interface AttachmentOptions {
  readonly invalidate?: (() => void) | undefined;
}

const INITIAL_WIDTH = 0;

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

    on.finalize(() => {
      events.record("resource:finalize");
    });

    return { element };
  });
}

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

describe("elementResourceDirective", () => {
  test("directive attaches an element-backed resource", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    const vElementResource = elementResourceDirective((element: HTMLElement) =>
      ElementAttachmentForTest(element, events, {
        invalidate: () => void marker.read(),
      }),
    );

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

  test("publishes a domain-shaped resource value into a Vue ref", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    const app = App({
      setup: () => {
        const elementWidth = shallowRef("100");
        const size = shallowRef<{ readonly width: number } | null>(null);
        const vSize = elementResourceDirective(
          (element: HTMLElement) => ElementSizeForTest(element, events, marker),
          { into: size },
        );

        return () =>
          h(Fragment, [
            h("p", size.value ? `width=${size.value.width}` : "pending"),
            h(
              "button",
              {
                onClick: () => {
                  elementWidth.value = "101";
                  marker.mark();
                },
              },
              "+",
            ),
            withDirectives(
              h("div", { "data-width": elementWidth.value }, "box"),
              [[vSize]],
            ),
          ]);
      },
    });

    const result = await renderApp(app, { events }).andExpect({
      output:
        '<p>width=100</p><button>+</button><div data-width="100">box</div>',
      events: ["size:attached", "size:sync"],
    });

    await result.click().andExpect({
      output:
        '<p>width=100</p><button>+</button><div data-width="101">box</div>',
    });

    await result.flush().andExpect({
      output:
        '<p>width=101</p><button>+</button><div data-width="101">box</div>',
      events: ["size:sync"],
    });

    marker.mark();
    await result.flush().andExpect({
      output:
        '<p>width=101</p><button>+</button><div data-width="101">box</div>',
      events: ["size:sync"],
    });

    await result.unmount().andExpect({ output: "", events: ["size:finalize"] });
  });

  test("clears the published value when the directive unmounts", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    const app = App({
      setup: () => {
        const visible = shallowRef(true);
        const size = shallowRef<{ readonly width: number } | null>(null);
        const vSize = elementResourceDirective(
          (element: HTMLElement) => ElementSizeForTest(element, events, marker),
          { into: size },
        );

        return () =>
          h(Fragment, [
            h("p", size.value ? `width=${size.value.width}` : "pending"),
            h("button", { onClick: () => (visible.value = false) }, "hide"),
            visible.value
              ? withDirectives(h("div", { "data-width": "100" }, "box"), [
                  [vSize],
                ])
              : null,
          ]);
      },
    });

    const result = await renderApp(app, { events }).andExpect({
      output:
        '<p>width=100</p><button>hide</button><div data-width="100">box</div>',
      events: ["size:attached", "size:sync"],
    });

    await result.click("hide").andExpect({
      output: "<p>pending</p><button>hide</button><!---->",
      events: ["size:finalize"],
    });

    marker.mark();
    events.expect([]);
  });
});

describe("elementResource", () => {
  test("handle exposes a directive and a Vue ref", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    const app = App({
      setup: () => {
        const elementWidth = shallowRef("100");
        const size = elementResource((element: HTMLElement) =>
          ElementSizeForTest(element, events, marker),
        );
        const vSize = size.directive;

        return () =>
          h(Fragment, [
            h(
              "p",
              size.value.value ? `width=${size.value.value.width}` : "pending",
            ),
            h(
              "button",
              {
                onClick: () => {
                  elementWidth.value = "101";
                  marker.mark();
                },
              },
              "+",
            ),
            withDirectives(
              h("div", { "data-width": elementWidth.value }, "box"),
              [[vSize]],
            ),
          ]);
      },
    });

    const result = await renderApp(app, { events }).andExpect({
      output:
        '<p>width=100</p><button>+</button><div data-width="100">box</div>',
      events: ["size:attached", "size:sync"],
    });

    await result.click().andExpect({
      output:
        '<p>width=100</p><button>+</button><div data-width="101">box</div>',
    });

    await result.flush().andExpect({
      output:
        '<p>width=101</p><button>+</button><div data-width="101">box</div>',
      events: ["size:sync"],
    });

    await result.unmount().andExpect({ output: "", events: ["size:finalize"] });
  });

  test("handle clears its Vue ref when the directive unmounts", async () => {
    const events = new RecordedEvents();
    const marker = Marker();

    const app = App({
      setup: () => {
        const visible = shallowRef(true);
        const size = elementResource((element: HTMLElement) =>
          ElementSizeForTest(element, events, marker),
        );
        const vSize = size.directive;

        return () =>
          h(Fragment, [
            h(
              "p",
              size.value.value ? `width=${size.value.value.width}` : "pending",
            ),
            h("button", { onClick: () => (visible.value = false) }, "hide"),
            visible.value
              ? withDirectives(h("div", { "data-width": "100" }, "box"), [
                  [vSize],
                ])
              : null,
          ]);
      },
    });

    const result = await renderApp(app, { events }).andExpect({
      output:
        '<p>width=100</p><button>hide</button><div data-width="100">box</div>',
      events: ["size:attached", "size:sync"],
    });

    await result.click("hide").andExpect({
      output: "<p>pending</p><button>hide</button><!---->",
      events: ["size:finalize"],
    });

    marker.mark();
    events.expect([]);
  });
});
