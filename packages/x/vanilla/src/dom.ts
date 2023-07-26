import type { Description, Reactive } from "@starbeam/interfaces";
import { CachedFormula, DEBUG, type FormulaFn } from "@starbeam/reactive";
import { onFinalize } from "@starbeam/shared";

import { Cursor } from "./cursor.js";

export function Text(
  text: Reactive<string>,
  description?: string | Description,
): ContentNode {
  return ContentNode(
    ({ into }) => {
      const node = into.insert(into.document.createTextNode(text.read()));

      return {
        cleanup: () => void node.remove(),
        update: () => (node.textContent = text.read()),
      };
    },
    DEBUG?.Desc("resource", description, "Text"),
  );
}

export function Comment(
  text: Reactive<string>,
  description?: string | Description,
): ContentNode {
  return ContentNode(
    ({ into }) => {
      const node = into.insert(into.document.createComment(text.read()));

      return {
        cleanup: () => void node.remove(),
        update: () => (node.textContent = text.read()),
      };
    },
    DEBUG?.Desc("resource", description, "Comment"),
  );
}

export function Fragment(
  nodes: ContentNode[],
  description?: string | Description,
): ContentNode {
  return ContentNode(
    ({ into, owner }) => {
      const start = placeholder(into.document);
      into.insert(start);

      const renderedNodes = nodes.map((nodeConstructor) =>
        nodeConstructor(into).create({ owner }),
      );

      const end = placeholder(into.document);
      into.insert(end);
      const range = FragmentRange.create(start, end);

      return {
        cleanup: () => void range.clear(),
        update: () => void poll(renderedNodes),
      };
    },
    DEBUG?.Desc("resource", description, "Fragment"),
  );
}

export function Attr<E extends Element>(
  name: string,
  value: Reactive<string | null | boolean>,
  description?: string | Description,
): AttrNode<E> {
  return ContentNode(
    ({ into }) => {
      const current = value.read();

      if (typeof current === "string") {
        into.setAttribute(name, current);
      } else if (current === true) {
        into.setAttribute(name, "");
      }

      return {
        cleanup: () => {
          into.removeAttribute(name);
        },
        update: () => {
          const next = value.read();

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
    DEBUG?.Desc("resource", description, "Attr"),
  );
}

export function Element<N extends string>(
  {
    tag,
    attributes,
    body,
  }: {
    tag: N;
    attributes: AttrNode[];
    body: ContentNode | ContentNode[];
  },
  description?: Description | string,
): ContentNode {
  return ContentNode(
    ({ into, owner }) => {
      const element = into.document.createElement(tag);
      const elementCursor = Cursor.appendTo(element);

      const renderAttributes = attributes.map((attrConstructor) =>
        attrConstructor(element).create({ owner }),
      );

      const fragment = Array.isArray(body) ? Fragment(body) : body;
      const renderBody = fragment(elementCursor).create({ owner });

      into.insert(element);

      return {
        cleanup: () => void element.remove(),
        update: () => {
          poll(renderAttributes);
          poll(renderBody);
        },
      };
    },
    DEBUG?.Desc("resource", description, "Element"),
  );
}

Element.Attr = Attr;

function placeholder(document: Document): Text {
  return document.createTextNode("");
}

type Rendered = FormulaFn<void>;

interface OutputConstructor {
  create: (options: { owner: object }) => Rendered;
}

type ContentNode = (into: Cursor) => OutputConstructor;
type AttrNode<E extends Element = Element> = (into: E) => OutputConstructor;

function poll(rendered: Rendered[] | Rendered): void {
  if (Array.isArray(rendered)) {
    rendered.forEach((node) => void node.read());
  } else {
    rendered.read();
  }
}

function ContentNode<T extends Cursor | Element>(
  create: (options: { into: T; owner: object }) => {
    cleanup: () => void;
    update: () => void;
  },
  description: Description | undefined,
): (into: T) => OutputConstructor {
  return (into: T) => {
    return {
      create({ owner }) {
        const { cleanup, update } = create({ into, owner });

        const formula = CachedFormula(update, description);

        onFinalize(owner, cleanup);

        return formula;
      },
    };
  };
}

class FragmentRange {
  static create(start: ChildNode, end: ChildNode): FragmentRange {
    return new FragmentRange(start, end);
  }

  #start: ChildNode;
  #end: ChildNode;

  private constructor(start: ChildNode, end: ChildNode) {
    this.#start = start;
    this.#end = end;
  }

  clear(): void {
    let current: ChildNode | null = this.#start;
    const end = this.#end;

    while (current !== null && current !== end) {
      const next: ChildNode | null = current.nextSibling;
      current.remove();
      current = next;
    }

    end.remove();
  }
}
