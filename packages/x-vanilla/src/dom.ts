import { type Reactive, Formula, LIFETIME } from "@starbeam/core";
import type { Description } from "@starbeam/debug";
import { descriptionFrom } from "@starbeam/debug";

import { Cursor } from "./cursor.js";

interface Rendered {
  poll(): void;
}

interface OutputConstructor {
  create: (options: { owner: object }) => Rendered;
}

type ContentNode = (into: Cursor) => OutputConstructor;
type AttrNode<E extends Element = Element> = (into: E) => OutputConstructor;

function Render<T extends Cursor | Element>(
  create: (options: { into: T; owner: object }) => {
    cleanup: () => void;
    update: () => void;
  },
  description: Description
): (into: T) => OutputConstructor {
  return (into: T) => {
    return {
      create({ owner }) {
        const { cleanup, update } = create({ into, owner });

        const formula = Formula(update, description);

        LIFETIME.on.cleanup(owner, cleanup);

        return {
          poll() {
            formula.current;
          },
        };
      },
    };
  };
}

export function Text(
  text: Reactive<string>,
  description?: string | Description
): ContentNode {
  return Render(
    ({ into }) => {
      const node = into.insert(into.document.createTextNode(text.current));

      return {
        cleanup: () => node.remove(),

        update: () => {
          node.textContent = text.current;
        },
      };
    },
    descriptionFrom({
      type: "resource",
      api: {
        package: "@starbeam/dom",
        name: "Text",
      },
      fromUser: description,
    })
  );
}

class FragmentRange {
  static create(start: ChildNode, end: ChildNode) {
    return new FragmentRange(start, end);
  }

  #start: ChildNode;
  #end: ChildNode;

  private constructor(start: ChildNode, end: ChildNode) {
    this.#start = start;
    this.#end = end;
  }

  clear() {
    let current: ChildNode | null = this.#start;
    const end = this.#end;

    while (current !== null && current !== end) {
      const next: ChildNode | null = current.nextSibling;
      current.remove();
      current = next;
    }

    end.remove();
  }

  get nodes(): Node[] {
    const nodes: Node[] = [];

    if (this.#start.nextSibling === this.#end) {
      return nodes;
    }

    let start = this.#start.nextSibling as ChildNode;
    const end = this.#end.previousSibling as ChildNode;

    while (start) {
      nodes.push(start);

      if (start === end) {
        break;
      }

      start = start.nextSibling as ChildNode;
    }

    return nodes;
  }
}

export function Fragment(
  nodes: ContentNode[],
  description?: string | Description
): ContentNode {
  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam/dom",
      name: "Fragment",
    },
    fromUser: description,
  });

  return Render(({ into, owner }) => {
    const start = placeholder(into.document);
    into.insert(start);

    const renderedNodes: Rendered[] = [];

    for (const nodeConstructor of nodes) {
      const node = nodeConstructor(into).create({ owner });
      renderedNodes.push(node);
    }

    const end = placeholder(into.document);
    into.insert(end);
    const range = FragmentRange.create(start, end);

    return {
      cleanup: () => range.clear(),

      update() {
        renderedNodes.forEach((node) => node.poll());
      },
    };
  }, desc);
}

export function Attr<E extends Element>(
  name: string,
  value: Reactive<string | null | boolean>,
  description?: string | Description
): AttrNode<E> {
  return Render(
    ({ into }) => {
      const current = value.current;

      if (typeof current === "string") {
        into.setAttribute(name, current);
      } else if (current === true) {
        into.setAttribute(name, "");
      }

      return {
        cleanup: () => into.removeAttribute(name),
        update: () => {
          const next = value.current;

          if (typeof next === "string") {
            into.setAttribute(name, next);
          } else if (next === true) {
            into.setAttribute(name, "");
          } else if (next === false) {
            into.removeAttribute(name);
          }
        },
      };
    },
    descriptionFrom({
      type: "resource",
      api: {
        package: "@starbeam/dom",
        name: "Attr",
      },
      fromUser: description,
    })
  );
}

export function Element(
  {
    tag,
    attributes,
    body,
  }: {
    tag: string;
    attributes: AttrNode[];
    body: ContentNode | ContentNode[];
  },
  description?: Description | string
): ContentNode {
  return Render(
    ({ into, owner }) => {
      const element = into.document.createElement(tag);
      const elementCursor = Cursor.appendTo(element);

      const renderAttributes: Rendered[] = [];

      for (const attrConstructor of attributes) {
        const attr = attrConstructor(element).create({ owner });
        renderAttributes.push(attr);
      }

      const fragment = Array.isArray(body) ? Fragment(body) : body;
      const renderBody = fragment(elementCursor).create({ owner });

      into.insert(element);

      return {
        cleanup: () => element.remove(),

        update: () => {
          for (const attr of renderAttributes) {
            attr.poll();
          }

          renderBody.poll();
        },
      };
    },
    descriptionFrom({
      type: "resource",
      api: {
        package: "@starbeam/dom",
        name: "Element",
      },
      fromUser: description,
    })
  );
}

Element.Attr = Attr;

function placeholder(document: Document) {
  return document.createTextNode("");
}
