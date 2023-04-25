// @vitest-environment jsdom

import { install } from "@starbeam/preact";
import { html, rendering } from "@starbeam-workspace/preact-testing-utils";
import { describe } from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll } from "vitest";

describe("useReactive", () => {
  beforeAll(() => {
    install(options);
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
