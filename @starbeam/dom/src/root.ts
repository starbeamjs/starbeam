import type { anydom, minimal } from "@domtree/flavors";
import {
  minimize,
  RenderedRoot,
  Root as CoreRoot,
  TIMELINE,
} from "@starbeam/core";
import type { JSDOM } from "jsdom";
import { ReactiveDOM } from "./dom.js";
import { DomEnvironment } from "./dom/environment.js";
import { DOM, MINIMAL } from "./dom/streaming/compatible-dom.js";
import { TreeConstructor } from "./dom/streaming/tree-constructor.js";
import type { ContentProgramNode } from "./program-node/content.js";

export class Root extends CoreRoot {
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

  readonly #environment: DomEnvironment;

  readonly dom: ReactiveDOM = new ReactiveDOM();
  readonly on = {
    advance: (callback: () => void): (() => void) =>
      TIMELINE.on.advance(callback),
  } as const;

  private constructor(
    document: DomEnvironment,
    children: object[],
    description: string
  ) {
    super(description);
    this.#environment = document;
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

  #appending(parent: anydom.ParentNode): minimal.TemplateElement {
    const placeholder = MINIMAL.element(
      this.#environment.document,
      parent as minimal.ParentNode,
      "template"
    );

    DOM.insert(placeholder, DOM.appending(parent));
    return placeholder;
  }
}
