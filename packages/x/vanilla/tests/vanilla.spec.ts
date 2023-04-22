// @vitest-environment happy-dom

import { Cell, RUNTIME } from "@starbeam/universal";
import { Comment, Cursor, El, Fragment, Text } from "@starbeamx/vanilla";
import { describe, expect, test } from "vitest";

import { env } from "./env";

describe("Vanilla Renderer", () => {
  test("it can render text", () => {
    const { body, owner } = env();

    const cell = Cell("Hello World");
    const text = Text(cell);
    const renderer = text(body.cursor);
    const render = renderer.create({ owner });

    expect(body.innerHTML).toBe("Hello World");

    cell.set("Goodbye world");
    render.read();

    expect(body.innerHTML).toBe("Goodbye world");

    RUNTIME.finalize(owner);
    render.read();

    expect(body.innerHTML).toBe("");
  });

  test("it can render a comment", () => {
    const { body, owner } = env();

    const cell = Cell("Hello World");
    const text = Comment(cell);
    const renderer = text(body.cursor);
    const render = renderer.create({ owner });

    expect(body.innerHTML).toBe("<!--Hello World-->");

    cell.set("Goodbye world");
    render.read();

    expect(body.innerHTML).toBe("<!--Goodbye world-->");

    RUNTIME.finalize(owner);
    render.read();

    expect(body.innerHTML).toBe("");
  });

  test("it can render fragments", () => {
    const { body, owner } = env();

    const a = Cell("Hello World");
    const b = Cell(" - ");
    const c = Cell("Goodbye World");

    const fragment = Fragment([Text(a), Text(b), Text(c)]);

    const cursor = body.cursor;
    const range = fragment(cursor).create({ owner });

    body.snapshot();

    expect(body.innerHTML).toBe("Hello World - Goodbye World");

    b.set(" ::: ");
    range.read();

    expect(body.innerHTML).toBe("Hello World ::: Goodbye World");
    body.expectStable();

    a.set("Hola World");
    range.read();

    expect(body.innerHTML).toBe("Hola World ::: Goodbye World");
    body.expectStable();

    RUNTIME.finalize(owner);

    expect(body.innerHTML).toBe("");
  });

  test('it can render elements', () => {
    const { body, owner } = env();
    const cursor = body.cursor;

    const a = Cell("Hello World");
    const b = Cell(" - ");
    const c = Cell("Goodbye World");

    const title = El.Attr("title", a);

    El({
      tag: "div",
      attributes: [title],
      body: [Text(a), Text(b), Text(c)],
    })(cursor).create({ owner });

    body.snapshot();
    expect(body.innerHTML).toBe(
      `<div title="Hello World">Hello World - Goodbye World</div>`
    );
  });

  // This is currently *very* slow
  test("it can render many elements", () => {
    const { body, owner } = env();
    const cursor = body.cursor;
    const fragments = [];

    for (let i = 0; i < 1000; i++) {
      const a = Cell("Hello World");
      const b = Cell(" - ");
      const c = Cell("Goodbye World");

      const title = El.Attr("title", a);

      const el = El({
        tag: "div",
        attributes: [title],
        body: [Text(a), Text(b), Text(c)],
      });
      fragments.push(el);
    }

    console.time('render');
    Fragment(fragments)(cursor).create({ owner });
    console.timeEnd('render');

    expect(body.snapshot().length).toBe(fragments.length);
  });
});

export class Body {
  #body: HTMLElement;
  #snapshot: ChildNode[];

  constructor(body: HTMLElement) {
    this.#body = body;
    this.#snapshot = [...body.childNodes];
  }

  get cursor(): Cursor {
    return Cursor.appendTo(this.#body);
  }

  get innerHTML(): string {
    return this.#body.innerHTML;
  }

  snapshot() : ChildNode[] {
    return this.#snapshot = [...this.#body.childNodes];
  }

  expectStable(): void {
    const snapshot = this.#snapshot;

    if (snapshot === null) {
      throw new Error("expectStable must be called after taking a snapshot");
    }

    // they should have the same length
    expect(this.#body.childNodes).toHaveLength(snapshot.length);

    for (let i = 0; i < snapshot.length; i++) {
      const node = this.#body.childNodes[i];
      const snapshotNode = snapshot[i];

      // they should have the same type
      expect(node, `node ${i}`).toBe(snapshotNode);
    }
  }
}
