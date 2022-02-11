import type { anydom, minimal } from "@domtree/flavors";
import type { JSDOM } from "jsdom";
import { ReactiveDOM } from "../dom.js";
import { DomEnvironment } from "../dom/environment.js";
import { DOM, MINIMAL } from "../dom/streaming/compatible-dom.js";
import { TreeConstructor } from "../dom/streaming/tree-constructor.js";
import type { HookBlueprint } from "../hooks/simple.js";
import {
  HookCursor,
  HookProgramNode,
  HookValue,
} from "../program-node/hook.js";
import type {
  ContentProgramNode,
  ProgramNode,
} from "../program-node/interfaces/program-node.js";
import { minimize } from "../strippable/minimal.js";
import { INSPECT } from "../utils.js";
import { LIFETIME } from "./lifetime/lifetime.js";
import { RenderedRoot } from "./root.js";

export const TIMELINE_SYMBOL = Symbol("TIMELINE");

export class Root {
  static jsdom(jsdom: JSDOM): Root {
    return Root.environment(DomEnvironment.jsdom(jsdom), `#<Universe jsdom>`);
  }

  /**
   * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
   * to use SimpleDOM with the real DOM as long as you don't need runtime
   * features like event handlers and dynamic properties.
   */
  static environment(
    environment: DomEnvironment,
    description = `#<Universe>`
  ): Root {
    return new Root(environment, [], description);
  }

  [INSPECT](): string {
    return this.#description;
  }

  readonly #environment: DomEnvironment;
  readonly #children: object[];
  readonly #description: string;

  readonly dom: ReactiveDOM = new ReactiveDOM();
  readonly on = {
    advance: (_callback: () => void): (() => void) => {
      throw Error("todo: universe.on.advance");
    },
  } as const;

  private constructor(
    document: DomEnvironment,
    children: object[],
    description: string
  ) {
    this.#environment = document;
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

  render(
    node: ContentProgramNode,
    { append }: { append: anydom.ParentNode }
  ): RenderedRoot<minimal.ParentNode> {
    return this.build(node, {
      cursor: TreeConstructor.html(this.#environment),
      hydrate: (buffer: TreeConstructor) => {
        buffer.replace(this.#appending(append));
        return minimize(append);
      },
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

  #appending(parent: anydom.ParentNode): minimal.TemplateElement {
    let placeholder = MINIMAL.element(
      this.#environment.document,
      parent as minimal.ParentNode,
      "template"
    );

    DOM.insert(placeholder, DOM.appending(parent));
    return placeholder;
  }
}
