 
 
 
 
// @vitest-environment jsdom

import { install, useService } from "@starbeam/preact";
import type { HtmlNode } from "@starbeam-workspace/preact-testing-utils";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  describe,
  RecordedEvents,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll, expect } from "vitest";

describe("useService", () => {
  const allEvents = new RecordedEvents();

  beforeAll(() => {
    install(options);
    allEvents.reset();
  });

  test("services are like resource", () => {
    const {
      resource: TestResourceBlueprint,
      id: outerId,
      events,
    } = TestResource();

    function App() {
      const test = useService(TestResourceBlueprint);
      return html`<p>${test.id}</p>`;
    }

    const result = render(App);
    expect(result.innerHTML).toBe(`<p>${outerId}</p>`);
    events.expect("setup");

    result.unmount();
    events.expect("finalize");
  });

  test("a service is only instantiated once", () => {
    const {
      resource: SharedResourceBlueprint,
      id: sharedId,
      events,
    } = TestResource();

    function Inner(): HtmlNode {
      const test = useService(SharedResourceBlueprint);
      return html`<p>inner: ${test.id}</p>`;
    }

    function App({ id }: { id: number }): HtmlNode {
      const test = useService(SharedResourceBlueprint);
      return html`<p>id prop: ${id}</p>
        <p>outer: ${test.id}</p>
        <${Inner} />`;
    }

    const result = render(App, { id: sharedId }).expect(
      ({ id }) =>
        html`<p>id prop: ${id}</p>
          <p>outer: ${sharedId}</p>
          <p>inner: ${sharedId}</p>`,
    );

    // @fixme sync should run
    events.expect("setup");

    result.rerender({ id: 2 });

    result.unmount();
    // @fixme
    // allEvents.expect("finalize");
  });
});
