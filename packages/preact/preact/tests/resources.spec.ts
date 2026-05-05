// @vitest-environment jsdom

import { install, setupResource, useResource } from "@starbeam/preact";
import { Resource } from "@starbeam/resource";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
  expect,
  RecordedEvents,
  test,
  TestResource,
  withCause,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";

describe("useResource", () => {
  beforeAll(() => void install(options));

  test("resources are cleaned up correctly", () => {
    expectResource((blueprint) => useResource(blueprint));
  });

  test("resources can be passed as a callback", () => {
    expectResource((blueprint) => useResource(() => blueprint, []));
  });

  test("resources rebuild when deps change", () => {
    const events = new RecordedEvents();

    const first = ResourceForDeps("first", events);
    const second = ResourceForDeps("second", events);

    function App({ resource }: { resource: ResourceForDeps }) {
      const test = useResource(() => resource, [resource]);
      return html`<p>${test.id}</p>`;
    }

    const result = render(App, { resource: first });

    expect(result.innerHTML).toBe(`<p>first</p>`);

    events.expect("first:setup", "first:sync");

    result.rerender({ resource: first });
    expect(result.innerHTML).toBe(`<p>first</p>`);
    events.expect([]);

    result.rerender({ resource: second });
    expect(result.innerHTML).toBe(`<p>second</p>`);
    events.expect(
      "second:setup",
      "first:cleanup",
      "first:finalize",
      "second:sync",
    );

    result.rerender({ resource: second });
    expect(result.innerHTML).toBe(`<p>second</p>`);
    events.expect([]);

    result.unmount();
    events.expect("second:cleanup", "second:finalize");
  });
});

describe("setupResource", () => {
  beforeAll(() => void install(options));

  test("resources are cleaned up correctly", () => {
    expectResource((blueprint) => setupResource(blueprint));
  });

  test("resources can be passed as a callback", () => {
    expectResource((blueprint) => setupResource(() => blueprint));
  });
});

function expectResource(
  appFn: (resource: ReturnType<typeof TestResource>["resource"]) => {
    id: number;
  },
): void {
  withCause(
    () => {
      const { resource, invalidate, events, id } = TestResource();

      function App() {
        const test = appFn(resource);
        return html`<p>${test.id}</p>`;
      }

      const result = render(App).expect({ id }, ({ id }) => html`<p>${id}</p>`);

      events.expect("setup", "sync");

      invalidate();
      result.rerender({});
      events.expect("cleanup", "sync");

      result.rerender({});
      events.expect([]);

      result.unmount();
      events.expect("cleanup", "finalize");
    },
    "test function was defined here",
    { entryFn: expectResource },
  );
}

type ResourceForDeps = ReturnType<typeof ResourceForDeps>;

function ResourceForDeps(id: string, events: RecordedEvents) {
  return Resource(({ on }) => {
    events.record(`${id}:setup`);

    on.sync(() => {
      events.record(`${id}:sync`);
      return () => void events.record(`${id}:cleanup`);
    });

    on.finalize(() => {
      events.record(`${id}:finalize`);
    });

    return { id };
  });
}
