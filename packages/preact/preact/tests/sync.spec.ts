// @vitest-environment jsdom

import { install, setupSync } from "@starbeam/preact";
import { Marker } from "@starbeam/reactive";
import { Sync } from "@starbeam/resource";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import {
  Actions,
  beforeAll,
  describe,
  expect,
  test,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";

describe("setupSync", () => {
  beforeAll(() => {
    install(options);
  });

  test("setupSync", () => {
    const actions = new Actions();
    let isSetup = false;
    const invalidate = Marker();

    const sync = Sync(() => {
      actions.record("setup");
      isSetup = true;
      invalidate.read();

      return () => {
        actions.record("cleanup");
        isSetup = false;
      };
    });

    function App() {
      setupSync(sync);

      return html`<p>hello world</p>`;
    }

    const result = render(App);
    actions.expect("setup");
    expect(result.innerHTML).toBe(`<p>hello world</p>`);

    result.unmount();
    actions.expect("cleanup");
  });
});
