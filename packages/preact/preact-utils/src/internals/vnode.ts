import {
  Fragment,
  type ComponentChild,
  type ComponentType,
  type VNode,
} from "preact";
import type { InternalPreactElement, InternalSource } from "../interfaces.js";
import {
  InternalComponent,
  type InternalPreactComponent,
} from "./component.js";

const BUILTINS = new Set<ComponentType>([Fragment]);

export class InternalVNode {
  static is(value: unknown): value is InternalVNode {
    return !!(
      value &&
      typeof value === "object" &&
      value instanceof InternalVNode
    );
  }

  static of(vnode: InternalPreactVNode): InternalVNode {
    return new InternalVNode(vnode);
  }

  static from(
    node: InternalVNode | InternalPreactVNode<unknown> | VNode
  ): InternalVNode;
  static from(node: IntoInternalVNode): InternalVNode | null | undefined;
  static from(node: IntoInternalVNode): InternalVNode | null | undefined {
    if (InternalVNode.is(node)) {
      return node;
    } else if (node) {
      return new InternalVNode(node as InternalPreactVNode);
    } else {
      return node;
    }
  }

  static asPreact(
    vnode: InternalVNode | InternalPreactVNode | VNode
  ): InternalPreactVNode;
  static asPreact(
    vnode: IntoInternalVNode
  ): InternalPreactVNode | null | undefined;
  static asPreact(
    vnode: IntoInternalVNode
  ): InternalPreactVNode | null | undefined {
    if (InternalVNode.is(vnode)) {
      return vnode.#vnode;
    } else {
      return vnode as InternalPreactVNode;
    }
  }

  readonly #vnode: InternalPreactVNode;

  private constructor(vnode: InternalPreactVNode) {
    this.#vnode = vnode;
  }

  get type(): VNode["type"] {
    return this.#vnode.type;
  }

  get props(): VNode["props"] {
    return this.#vnode.props;
  }

  get source(): InternalSource | null | undefined {
    return this.#vnode[KEYS.__source];
  }

  set source(value: InternalSource | null | undefined) {
    this.#vnode[KEYS.__source] = value;
  }

  get self(): unknown {
    return this.#vnode[KEYS.__self];
  }

  set self(value: unknown) {
    this.#vnode[KEYS.__self] = value;
  }

  get dom(): Element | Text | undefined {
    return this.#vnode[KEYS._dom];
  }

  get owner(): InternalVNode | null | undefined {
    return InternalVNode.from(this.#vnode[KEYS._owner]);
  }

  set owner(vnode: IntoInternalVNode) {
    this.#vnode[KEYS._owner] = InternalVNode.asPreact(vnode);
  }

  get component(): InternalComponent | null | undefined {
    const component = this.#vnode[KEYS._component];
    return component ? InternalComponent.of(component) : component;
  }

  get parent(): InternalVNode | null | undefined {
    return InternalVNode.from(this.#vnode[KEYS._parent]);
  }

  get children(): InternalVNode[] | undefined {
    const children = this.#vnode[KEYS._children];

    if (children) {
      return children.map(InternalVNode.of);
    } else {
      return undefined;
    }
  }

  get signalProps(): Record<string, unknown> | null | undefined {
    return this.#vnode[KEYS["signals._signalProps"]];
  }

  delete = {
    parent: (): void => {
      delete this.#vnode[KEYS._parent];
    },

    depth: (): void => {
      delete this.#vnode[KEYS._depth];
    },
  } as const;

  processChildren(process: (prev: ComponentChild) => ComponentChild): void {
    const props = this.#vnode.props;
    const children = props.children;

    if (children) {
      if (Array.isArray(children)) {
        props.children = children.map(process);
      } else {
        props.children = process(children);
      }
    }
  }
}

export type IntoInternalVNode =
  | InternalVNode
  | InternalPreactVNode<unknown>
  | VNode
  | null
  | undefined;

const KEYS = {
  __source: "__source",
  __self: "__self",
  _parentDom: "__P",
  _owner: "__o",
  _children: "__k",
  _component: "__c",
  _parent: "__",
  _dom: "__e",
  _depth: "__b",
  "signals._signalProps": "__np",
} as const;

export interface InternalPreactVNode<P = unknown> extends preact.VNode<P> {
  __source?: InternalSource | null;
  __self?: unknown;

  /** The parent DOM */
  __P?: InternalPreactElement | null;
  /** The component's owner */
  __o?: InternalPreactVNode | null;
  /** The component's children */
  __k: InternalPreactVNode[] | null;
  /** The component instance for this VNode */
  __c?: InternalPreactComponent | null;
  /** The parent VNode */
  __?: InternalPreactVNode;
  /** The DOM node for this VNode */
  __e?: Element | Text;
  /** The depth of the vnode */
  __b?: number | null;
  /** Props that had Signal values before diffing (used after diffing to subscribe) */
  __np?: Record<string, unknown> | null;
}

export function isUserspaceComponent(
  vnode: InternalPreactVNode | VNode
): vnode is InternalPreactVNode & { __c: InternalPreactComponent } {
  return (
    typeof vnode.type === "function" &&
    !BUILTINS.has(vnode.type) &&
    hasVNodeComponent(vnode as InternalPreactVNode)
  );
}

function hasVNodeComponent(vnode: InternalPreactVNode): boolean {
  return !!vnode.__c;
}

export function getVNodeComponent<N extends InternalPreactVNode>(
  vnode: N
): N["__c"] {
  return vnode.__c;
}
