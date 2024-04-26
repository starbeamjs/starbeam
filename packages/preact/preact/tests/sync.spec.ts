 
 
 
 
// @vitest-environment jsdom

import { install, setupSync } from "@starbeam/preact";
import { Marker } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";

describe("setupSync", () => {
  beforeAll(() => {
    install(options);
  });

  test("setupSync", () => {
    const actions = new RecordedEvents();
    const invalidate = Marker();

    const sync = Resource(({ on }) => {
      actions.record("setup");

      on.sync(() => {
        actions.record("sync");
        invalidate.read();

        return () => void actions.record("cleanup");
      });

      on.finalize(() => {
        actions.record("finalize");
      });
    });

    function App() {
      setupSync(sync);

      return html`<p>hello world</p>`;
    }

    const result = render(App);
    actions.expect("setup", "sync");
    expect(result.innerHTML).toBe(`<p>hello world</p>`);

    invalidate.mark();
    result.rerender({});
    actions.expect("cleanup", "sync");

    result.unmount();
    actions.expect("cleanup", "finalize");
  });
});
