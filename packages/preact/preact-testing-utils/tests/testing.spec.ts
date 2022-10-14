// @vitest-environment jsdom

import { describe } from "@starbeam-workspace/test-utils";
import { rendering, html } from "@starbeam/preact-testing-utils";
import { options } from "preact";
import { setup } from "@starbeam/preact";
import { beforeAll } from "vitest";

describe("useReactive", () => {
  beforeAll(() => setup(options));

  rendering.test(
    "baseline",
    ({ name }: { name: string }) => html`<div>hello ${name}</div>`,
    (render) =>
      render
        .html(({ name }) => html`<div>hello ${name}</div>`)
        .render({ name: "world" })
  );

  rendering.test(
    "rerendering",
    ({ name }: { name: string }) => html`<div>hello ${name}</div>`,
    (render) =>
      render
        .html(({ name }) => html`<div>hello ${name}</div>`)
        .render({ name: "world" })
        .update({ name: "cruel world" })
  );
});
