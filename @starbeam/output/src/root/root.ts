import { LIFETIME } from "@starbeam/timeline";
import type { ProgramNode } from "../program-node/program-node.js";
import { RenderedRoot } from "./rendered-root.js";

const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class Root {
  [INSPECT](): string {
    return this.#description;
  }

  readonly #description: string;

  protected constructor(description: string) {
    this.#description = description;
  }

  build<Cursor, Container>(
    node: ProgramNode<Cursor, Container>,
    {
      cursor,
      hydrate,
    }: { cursor: Cursor; hydrate: (cursor: Cursor) => Container }
  ): RenderedRoot<Container> {
    let rendered = node.render(cursor);

    let container = hydrate(cursor);

    let root = RenderedRoot.create({
      rendered,
      container,
    });

    LIFETIME.link(root, rendered);

    return root;
  }
}
