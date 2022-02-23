import { LIFETIME } from "../core/lifetime/lifetime.js";
import { TIMELINE } from "../core/timeline/timeline.js";
import type { HookBlueprint } from "../hooks/simple.js";
import {
  HookCursor,
  HookProgramNode,
  type HookValue,
} from "../program-node/hook.js";
import type { ProgramNode } from "../program-node/program-node.js";
import { INSPECT } from "../utils.js";
import { RenderedRoot } from "./rendered-root.js";

export class Root {
  [INSPECT](): string {
    return this.#description;
  }

  readonly #children: object[];
  readonly #description: string;

  readonly on = {
    advance: (callback: () => void): (() => void) =>
      TIMELINE.on.advance(callback),
  } as const;

  protected constructor(children: object[], description: string) {
    this.#children = children;
    this.#description = description;
  }

  use<T>(
    hook: HookBlueprint<T>,
    { into }: { into: HookValue<T> }
  ): RenderedRoot<HookValue<T>> {
    let node = HookProgramNode.create(this, hook);
    return this.build(node, {
      cursor: HookCursor.create(),
      hydrate: () => into,
    });
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
