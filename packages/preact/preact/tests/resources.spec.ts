// @vitest-environment jsdom

import { install, setupResource, useResource } from "@starbeam/preact";
import { type ResourceBlueprint } from "@starbeam/resource";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
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
  appFn: (resource: ResourceBlueprint<{ id: number }>) => { id: number },
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
      // expect(resources.last.isActive).toBe(false);
    },
    "test function was defined here",
    { entryFn: expectResource },
  );
}
