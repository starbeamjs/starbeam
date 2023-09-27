import { DisplayStruct } from "../inspect.js";
import { type InternalPreactVNode, InternalVNode } from "./vnode.js";

const INITIAL_ID = 0;
const ELEMENTS = new WeakMap<InternalPreactElement, InternalElement>();

export class InternalElement {
  static #nextId = INITIAL_ID;

  static of(element: InternalPreactElement): InternalElement {
    let internalElement = ELEMENTS.get(element);

    if (!internalElement) {
      internalElement = new InternalElement(element);
      ELEMENTS.set(element, internalElement);
    }

    return internalElement;
  }

  readonly #id: number;
  readonly #element: InternalPreactElement;

  private constructor(element: InternalPreactElement) {
    this.#id = InternalElement.#nextId++;
    this.#element = element;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const optionalFields: {
      listeners?: PreactEventListeners;
      children?: InternalVNode;
    } = {};

    const listeners = this.listeners;
    if (listeners) {
      optionalFields.listeners = listeners;
    }

    const children = this.children;
    if (children) {
      optionalFields.children = children;
    }

    return DisplayStruct(
      "InternalElement",
      {
        element: `${this.#element.tagName.toLowerCase()}`,
        ...optionalFields,
      },
      { description: `#${this.#id}` },
    );
  }

  get children(): InternalVNode | null | undefined {
    return InternalVNode.from(this.#element[PREACT_ELEMENT_KEYS._children]);
  }

  get listeners(): PreactEventListeners | undefined {
    return this.#element[PREACT_ELEMENT_KEYS._listeners];
  }
}

const PREACT_ELEMENT_KEYS = {
  _children: "__k",
  _listeners: "l",
} as const;

type PreactEventListeners = Record<string, (e: Event) => void>;

export interface InternalPreactElement extends HTMLElement {
  /** children */
  __k?: InternalPreactVNode | null;
  /** Event listeners to support event delegation */
  l?: PreactEventListeners;

  // Preact uses this attribute to detect SVG nodes
  ownerSVGElement?: SVGElement | null;

  // style: HTMLElement["style"]; // From HTMLElement

  data?: string | number; // From Text node
}
