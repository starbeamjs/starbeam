// @vitest-environment jsdom

import { install, setup } from "@starbeam/preact";
import {
  html,
  rendering,
  Root,
} from "@starbeam-workspace/preact-testing-utils";
import {
  beforeAll,
  describe,
  expect,
  resources,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { options } from "preact";

describe("resources", () => {
  beforeAll(() => {
    install(options);
  });

  rendering.test(
    "resources are cleaned up correctly",
    function App() {
      const test = setup(TestResource);
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

  rendering.test(
    "resources can be passed as a callback",
    function App() {
      const test = setup(() => TestResource);
      return html`<p>${test.id}</p>`;
    },
    expectResource
  );
});

const expectResource = Root((root) =>
  root
    .expect(({ id }: { id: number }) => html`<p>${id}</p>`)
    .render({ id: resources.nextId })
    .unmount({
      after: () => {
        expect(resources.last.isActive).toBe(false);
      },
    })
);
