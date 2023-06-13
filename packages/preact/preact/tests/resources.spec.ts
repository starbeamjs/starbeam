// @vitest-environment jsdom

import { install, setupResource, useResource } from "@starbeam/preact";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import type { TestResourceImpl } from "@starbeam-workspace/test-utils";
import {
  beforeAll,
  describe,
  expect,
  resources,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";

describe("useResource", () => {
  beforeAll(() => void install(options));

  test("resources are cleaned up correctly", () => {
    expectResource(() => useResource(TestResource));
  });

  test("resources can be passed as a callback", () => {
    expectResource(() => useResource(() => TestResource, []));
  });
});

describe("setupResource", () => {
  beforeAll(() => void install(options));

  test("resources are cleaned up correctly", () => {
    expectResource(() => setupResource(TestResource).read());
  });

  test("resources can be passed as a callback", () => {
    expectResource(() => setupResource(() => TestResource).read());
  });
});

function expectResource(resource: () => TestResourceImpl): void {
  function App() {
    const test = resource();
    return html`<p>${test.id}</p>`;
  }

  const initialResourceId = resources.nextId;
  const result = render(App).expect(
    ({ id }: { id: number }) => html`<p>${id}</p>`,
    { id: initialResourceId }
  );

  result.unmount();
  expect(resources.last).toSatisfy((r: TestResourceImpl) => !r.isActive);
}
