// @vitest-environment jsdom

import { setup } from "@starbeam/preact";
import { html, rendering } from "@starbeam-workspace/preact-testing-utils";
import { describe } from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll } from "vitest";

describe("useReactive", () => {
  beforeAll(() => {
    setup(options);
  });

  rendering.test(
    "baseline",
    ({ name }: { name: string }) => html`<div>hello ${name}</div>`,
    (render) =>
      render
        .expect(({ name }) => html`<div>hello ${name}</div>`)
        .render({ name: "world" })
  );

  rendering.test(
    "rerendering",
    ({ name }: { name: string }) => html`<div>hello ${name}</div>`,
    (render) =>
      render
        .expect(({ name }) => html`<div>hello ${name}</div>`)
        .render({ name: "world" })
        .update({ name: "cruel world" })
  );
});
