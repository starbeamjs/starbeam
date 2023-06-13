// @vitest-environment jsdom

import { install } from "@starbeam/preact";
import { html, render } from "@starbeam-workspace/preact-testing-utils";
import { describe, test } from "@starbeam-workspace/test-utils";
import { options } from "preact";
import { beforeAll } from "vitest";

describe("preact-testing-utils", () => {
  beforeAll(() => {
    install(options);
  });

  function App({ name }: { name: string }) {
    return html`<div>hello ${name}</div>`;
  }

  test("render", () => {
    render(App, { name: "world" }).expect(
      ({ name }) => html`<div>hello ${name}</div>`
    );
  });

  test("rerender", () => {
    const result = render(App, { name: "world" }).expect(
      ({ name }) => html`<div>hello ${name}</div>`
    );

    result.rerender({ name: "cruel world" });
  });
});
