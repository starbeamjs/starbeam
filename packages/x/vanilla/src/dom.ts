/**
  * TODO:
  *  - DynamicFragment
  *  - Comment
  *  - Namespaces
  *  - SVG
  *  - Modifier
  *  - Portal
  *  - SSR
  *
  *  Goals:
  *   - Implement Glimmer compatibility
  *   - Write compiler Glimmer -> whatever this DSL ends up being
  *
  * Stretch Goals:
  *   - other compilers (html``)
  */
import type { Description, Reactive } from "@starbeam/interfaces";
import { CachedFormula, DEBUG } from "@starbeam/reactive";
import { Resource, type ResourceBlueprint,RUNTIME,use } from "@starbeam/universal";

import { Cursor } from "./cursor.js";

export function Text(
  text: Reactive<string>,
  description?: string | Description
): ContentNode {
  return Content(
    ({ into, owner }) => {
      const node = into.insert(into.document.createTextNode(text.read()));
      
      return Resource(({ on }) => {
        on.cleanup(() =>  void node.remove());
        node.textContent = text.read();
    })
  }

  , DEBUG?.Desc('resource', description, 'Text'));
}

export function Comment(
  text: Reactive<string>,
  description?: string | Description
): ContentNode {
  return Content(({ into }) => {
    const node = into.insert(into.document.createComment(text.read()));

    return Resource(({ on }) => {
      on.cleanup(() => void node.remove());
      node.textContent = text.read();
    });
  }, DEBUG?.Desc("resource", description, "Comment"));
}

export function Fragment(
  nodes: ContentNode[],
  description?: string | Description
): ContentNode {
  return Content(({ into, owner }) => {
    const start = placeholder(into.document);
    into.insert(start);

    const renderedNodes = 
      nodes.map(
        (nodeConstructor) => nodeConstructor(into).create({ owner })
    );

    const end = placeholder(into.document);
    into.insert(end);
    const range = FragmentRange.create(start, end);

    return Resource(({ on }) => {
      on.cleanup(() => void range.clear());
      poll(renderedNodes);
    })
  }, DEBUG?.Desc("resource", description, "Fragment"));
}

export function Attr<E extends Element>(
  name: string,
  value: Reactive<string | null | boolean>,
  description?: string | Description
): AttrNode<E> {
  return Content(({ into }) => {
    const current = value.read();

    if (typeof current === "string") {
      into.setAttribute(name, current);
    } else if (current === true) {
      into.setAttribute(name, "");
    }

    return Resource(({ on }) => {
      on.cleanup(() => void into.removeAttribute(name));
      const next = value.read();

      if (typeof next === "string") {
        into.setAttribute(name, next);
      } else if (next === true) {
        into.setAttribute(name, "");
      } else if (next === false) {
        into.removeAttribute(name);
      }
    });
  }, DEBUG?.Desc("resource", description, "Attr"));
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
  description?: Description | string
): ContentNode {
  return Content(({ into, owner }) => {
    const element = into.document.createElement(tag);
    const elementCursor = Cursor.appendTo(element);

    const renderAttributes = attributes.map((attrConstructor) =>
      attrConstructor(element).create({ owner })
    );

    const fragment = Array.isArray(body) ? Fragment(body) : body;
    const renderBody = fragment(elementCursor).create({ owner });

    into.insert(element);

    return Resource(({on}, meta) => {
      on.cleanup(() => void element.remove());

      return {
        update: () => {
          renderAttributes.forEach(a => a.read());
          poll(renderBody);
        },
      }
    });
  }, DEBUG?.Desc("resource", description, "Element"));
}

Element.Attr = Attr;

function placeholder(document: Document): Text {
  return document.createTextNode("");
}

type Rendered = Resource;

interface OutputConstructor {
  create: (options: { owner: object }) => { 
    read: () => void; 
    update: () => void 
  }; 
}
type ContentNode = (into: Cursor) => OutputConstructor;
type AttrNode<E extends Element = Element> = (into: E) => Resource;

function poll(rendered: Rendered[] | Rendered): void {
  if (Array.isArray(rendered)) {
    rendered.forEach((node) => void node.read());
  } else {
    rendered.read();
  }
}

type ContentConstructor<T extends Cursor | Element> = (options: { into: T, owner: object }) => ResourceBlueprint<{
    read: () => void, 
    update: () => void
  }>;

function Content<T extends Cursor | Element>(
  create: ContentConstructor<T>, 
  description: Description | undefined
): (into: T) => OutputConstructor {
  return (into: T) => {
    return {
      create({ owner }) {
        const blueprint = create({ into, owner });
        const formula = CachedFormula(() => (use(blueprint, { lifetime: owner })).current, description);

        RUNTIME.onFinalize(owner, () => void RUNTIME.finalize(formula));

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
