// @vitest-environment jsdom

import { install, useService } from "@starbeam/preact";
import {
  html,
  type HtmlNode,
  rendering,
} from "@starbeam-workspace/preact-testing-utils";
import {
  describe,
  resources,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll, expect } from "vitest";

describe("useService", () => {
  beforeAll(() => {
    install(options);
  });

  rendering.test(
    "services are like resources",
    function App() {
      const test = useService(TestResource);
      return html`<p>${test.id}</p>`;
    },
    (root) =>
      root
        .expect(({ id }: { id: number }) => html`<p>${id}</p>`)
        .render({ id: resources.nextId })
        .unmount({
          after: () => {
            expect(resources.last.isActive).toBe(false);
          },
        })
  );

  function Inner(): HtmlNode {
    const test = useService(TestResource);
    return html`<p>inner: ${test.id}</p>`;
  }

  rendering.test(
    "a service is only instantiated once",
    function App({ id }: { id: number }): HtmlNode {
      const test = useService(TestResource);
      return html`<p>id prop: ${id}</p>
        <p>outer: ${test.id}</p>
        <${Inner} />`;
    },
    (root) =>
      root
        .expect(
          ({ id }) =>
            html`<p>id prop: ${id}</p>
              <p>outer: ${resources.last.id}</p>
              <p>inner: ${resources.last.id}</p>`
        )
        .render({ id: 1 })
        .render({ id: 2 })
        .unmount({
          after: () => {
            expect(resources.last).toSatisfy((r) => !r.isActive);
          },
        })
  );
});
