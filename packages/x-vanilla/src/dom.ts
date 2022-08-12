import { type ResourceBlueprint, LIFETIME, Resource } from "@starbeam/core";
import type { Description } from "@starbeam/debug";
import { descriptionFrom } from "@starbeam/debug";
import type { Reactive } from "@starbeam/timeline";

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
  callback: (options: { into: T; owner: object }) => ResourceBlueprint<T>
): (into: T) => OutputConstructor {
  return (into: T) => {
    return {
      create({ owner }) {
        const resource = callback({ into, owner }).create({ owner });

        LIFETIME.link(owner, resource);
        Resource.setup(resource);

        return {
          poll() {
            resource.current;
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
  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam/dom",
      name: "Text",
    },
    fromUser: description,
  });

  return Render(({ into }) => {
    return Resource(({ on }) => {
      const node = into.document.createTextNode(text.read());

      on.setup(() => {
        into.insert(node);

        return () => node.remove();
      });

      return () => {
        node.textContent = text.read();
        return into;
      };
    }, desc);
  });
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
    return Resource(({ on }) => {
      const renderedNodes: Rendered[] = [];
      const start = placeholder(into.document);
      const end = placeholder(into.document);
      const range = FragmentRange.create(start, end);

      on.setup(() => {
        into.insert(start);

        for (const nodeConstructor of nodes) {
          const node = nodeConstructor(into).create({ owner });
          renderedNodes.push(node);
        }

        into.insert(end);

        return () => {
          range.clear();
        };
      });

      return () => {
        renderedNodes.forEach((node) => node.poll());
        return into;
      };
    }, desc);
  });
}

export function Attr<E extends Element>(
  name: string,
  value: Reactive<string | null | boolean>,
  description?: string | Description
): AttrNode<E> {
  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam/dom",
      name: "Attr",
    },
    fromUser: description,
  });
  return Render(({ into }) => {
    return Resource(({ on }) => {
      const current = value.read();

      if (typeof current === "string") {
        into.setAttribute(name, current);
      } else if (current === true) {
        into.setAttribute(name, "");
      }

      on.setup(() => {
        return () => {
          into.removeAttribute(name);
        };
      });

      return () => {
        const next = value.read();

        if (typeof next === "string") {
          into.setAttribute(name, next);
        } else if (next === true) {
          into.setAttribute(name, "");
        } else if (next === false) {
          into.removeAttribute(name);
        }

        return into;
      };
    }, desc);
  });
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
  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam/dom",
      name: "Element",
    },
    fromUser: description,
  });
  return Render(({ into, owner }) => {
    return Resource(({ on }) => {
      const element = into.document.createElement(tag);
      const elementCursor = Cursor.appendTo(element);

      const renderAttributes: Rendered[] = [];

      for (const attrConstructor of attributes) {
        const attr = attrConstructor(element).create({ owner });
        renderAttributes.push(attr);
      }

      const fragment = Array.isArray(body) ? Fragment(body) : body;
      const renderBody = fragment(elementCursor).create({ owner });

      on.setup(() => {
        into.insert(element);

        return () => {
          element.remove();
        };
      });

      return () => {
        for (const attr of renderAttributes) {
          attr.poll();
        }

        renderBody.poll();

        return into;
      };
    });
  });
}

Element.Attr = Attr;

function placeholder(document: Document) {
  return document.createTextNode("");
}
