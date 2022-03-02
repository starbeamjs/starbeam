import { LIFETIME } from "@starbeam/lifetime";
import { TIMELINE } from "@starbeam/timeline";
import type { HookBlueprint } from "../hooks/simple.js";
import {
  HookCursor,
  HookProgramNode,
  HookValue,
} from "../program-node/hook.js";
import type { ProgramNode } from "../program-node/program-node.js";
import { INSPECT } from "../utils.js";
import { RenderedRoot } from "./rendered-root.js";

export class Root {
  static use<T>(hook: HookBlueprint<T>) {
    const root = new Root(hook.description);
    const node = HookProgramNode.create(root, hook);
    const value = HookValue.create();

    let rendered = root.build(node, {
      cursor: HookCursor.create(),
      hydrate: () => value,
    });

    return new RenderedHook(value, rendered);
  }

  [INSPECT](): string {
    return this.#description;
  }

  readonly #description: string;

  readonly on = {
    advance: (callback: () => void): (() => void) =>
      TIMELINE.on.advance(callback),
  } as const;

  protected constructor(description: string) {
    this.#description = description;
  }

  use<T>(
    hook: HookBlueprint<T>,
    { into }: { into: HookValue<T> } = { into: HookValue.create() }
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

class RenderedHook<T> {
  readonly #value: HookValue<T>;
  readonly #root: RenderedRoot<HookValue<T>>;

  constructor(value: HookValue<T>, root: RenderedRoot<HookValue<T>>) {
    this.#value = value;
    this.#root = root;
  }

  poll(): T {
    this.#root.poll();
    return this.#value.current;
  }
}

export const use = Root.use;
