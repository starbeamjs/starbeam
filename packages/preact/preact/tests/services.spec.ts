// @vitest-environment jsdom

import { install, useService } from "@starbeam/preact";
import {
  html,
  type HtmlNode,
  render,
} from "@starbeam-workspace/preact-testing-utils";
import type { TestResourceImpl } from "@starbeam-workspace/test-utils";
import {
  describe,
  resources,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll, expect } from "vitest";

describe("useService", () => {
  beforeAll(() => {
    install(options);
  });

  test("services are like resource", () => {
    function App() {
      const test = useService(TestResource);
      return html`<p>${test.id}</p>`;
    }

    const result = render(App);
    expect(result.innerHTML).toBe(`<p>${resources.currentId}</p>`);

    result.unmount();
    expect(resources.last.isActive).toBe(false);
  });

  function Inner(): HtmlNode {
    const test = useService(TestResource);
    return html`<p>inner: ${test.id}</p>`;
  }

  test("a service is only instantiated once", () => {
    function App({ id }: { id: number }): HtmlNode {
      const test = useService(TestResource);
      return html`<p>id prop: ${id}</p>
        <p>outer: ${test.id}</p>
        <${Inner} />`;
    }

    const initialResourceId = resources.nextId;

    const result = render(App, { id: 1 }).expect(
      ({ id }) => html`<p>id prop: ${id}</p>
        <p>outer: ${initialResourceId}</p>
        <p>inner: ${initialResourceId}</p>`
    );

    result.rerender({ id: 2 });

    result.unmount();
    expect(resources.last).toSatisfy((r: TestResourceImpl) => !r.isActive);
  });
});
