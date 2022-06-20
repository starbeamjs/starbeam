import type { Reactive, ResourceConstructor } from "@starbeam/core";
import { Resource } from "@starbeam/core";

import { Cursor } from "./cursor.js";

type ContentNode = (into: Cursor) => ResourceConstructor<void>;

export function Text(
  text: Reactive<string>
): (into: Cursor) => ResourceConstructor<void> {
  return (into) => {
    const current = text.current;

    return Resource((r) => {
      const node = into.document.createTextNode(current);
      into.insert(node);
      r.on.cleanup(() => {
        node.remove();
      });
      return () => {
        node.data = text.current;
      };
    });
  };
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
  nodes: ContentNode[]
): (into: Cursor) => ResourceConstructor<void> {
  return (into) => {
    const owner = {};

    const start = placeholder(into.document);
    into.insert(start);

    const renderNodes: Resource<void>[] = [];

    for (const nodeConstructor of nodes) {
      const node = nodeConstructor(into).create({ owner });
      renderNodes.push(node);
    }

    const end = placeholder(into.document);
    into.insert(end);

    const range = FragmentRange.create(start, end);
    return Resource((r) => {
      r.link(owner);

      r.on.cleanup(() => {
        range.clear();
      });

      return () => {
        for (const node of renderNodes) {
          node.current;
        }
      };
    });
  };
}

type AttrNode = <E extends Element>(into: E) => ResourceConstructor<void>;

export function Attr<E extends Element>(
  name: string,
  value: Reactive<string | null | boolean>
): (into: E) => ResourceConstructor<void> {
  return (into) => {
    const current = value.current;

    return Resource((r) => {
      if (typeof current === "string") {
        into.setAttribute(name, current);
      } else if (current === true) {
        into.setAttribute(name, "");
      }

      r.on.cleanup(() => {
        into.removeAttribute(name);
      });

      return () => {
        const next = value.current;
        if (typeof next === "string") {
          into.setAttribute(name, next);
        } else if (next === true) {
          into.setAttribute(name, "");
        } else {
          into.removeAttribute(name);
        }
      };
    });
  };
}

export function Element({
  tag,
  attributes,
  body,
}: {
  tag: string;
  attributes: AttrNode[];
  body: ContentNode | ContentNode[];
}): (into: Cursor) => ResourceConstructor<void> {
  return (into) => {
    const owner = {};

    const element = into.document.createElement(tag);
    const elementCursor = Cursor.appendTo(element);

    const renderAttributes: Resource<void>[] = [];

    for (const attrConstructor of attributes) {
      const attr = attrConstructor(element).create({ owner });
      renderAttributes.push(attr);
    }

    const fragment = Array.isArray(body) ? Fragment(body) : body;
    const renderBody = fragment(elementCursor).create({ owner });

    into.insert(element);

    return Resource((r) => {
      r.link(owner);

      r.on.cleanup(() => {
        element.remove();
      });

      return () => {
        for (const attr of renderAttributes) {
          attr.current;
        }
        renderBody.current;
      };
    });
  };
}

Element.Attr = Attr;

function placeholder(document: Document) {
  return document.createTextNode("");
}
