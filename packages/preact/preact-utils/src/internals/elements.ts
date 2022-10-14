import { InternalVNode, type InternalPreactVNode } from "./vnode.js";

export class InternalElement {
  static of(element: InternalPreactElement): InternalElement {
    return new InternalElement(element);
  }

  readonly #element: InternalPreactElement;

  private constructor(element: InternalPreactElement) {
    this.#element = element;
  }

  get children(): InternalVNode | null | undefined {
    return InternalVNode.from(this.#element[PREACT_ELEMENT_KEYS["_children"]]);
  }

  get listeners(): PreactEventListeners | undefined {
    return this.#element[PREACT_ELEMENT_KEYS["_listeners"]];
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
