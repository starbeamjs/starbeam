// @vitest-environment jsdom

import { Cell, LIFETIME } from "@starbeam/core";
import { describe, expect, test } from "@starbeam-workspace/test-utils";
import htm from "htm";
import { h, options, render } from "preact";
import { create, setup } from "@starbeam/preact";
import { beforeAll } from "vitest";
import { TestElement } from "./support/testing.js";

const html = htm.bind(h);
let id = 0;

describe("useReactive", () => {
  beforeAll(() => setup(options));

  test("baseline", () => {
    function App({ name }: { name: string }) {
      return html`<div>hello ${name}</div>`;
    }

    render(html`<${App} name="World" />`, document.body);

    expect(document.body.innerHTML).toBe("<div>hello World</div>");
  });

  test("reactive values render", () => {
    function App() {
      const { cell, increment } = create(ReactiveObject);

      return html`<p>${cell}</p>
        <button onClick=${increment}>++</button>`;
    }

    render(html`<${App} />`, document.body);

    expect(document.body.innerHTML).toBe("<p>0</p><button>++</button>");
  });

  test("reactive values update", async () => {
    function App() {
      const { cell, increment } = create(ReactiveObject);

      return html`<p>${cell}</p>
        <button onClick=${increment}>++</button>`;
    }

    render(html`<${App} />`, document.body);
    const result = TestElement.create(document.body);

    expect(result.innerHTML).toBe("<p>0</p><button>++</button>");

    await result.find("button").fire.click();

    expect(result.innerHTML).toBe("<p>1</p><button>++</button>");
  });
});

// eslint-disable-next-line unused-imports/no-unused-vars
class TestResource {
  static #nextId = 0;

  static create() {
    return new TestResource(TestResource.#nextId++);
  }

  #id: number;
  #active = true;

  constructor(id: number) {
    this.#id = id;

    LIFETIME.on.cleanup(this, () => {
      this.#active = false;
    });
  }

  get id() {
    return this.#id;
  }

  get isActive() {
    return this.#active;
  }
}

function ReactiveObject() {
  const cell = Cell(0, `#${++id}`);

  function increment() {
    cell.set(cell.current + 1);
  }

  return { cell, increment };
}
