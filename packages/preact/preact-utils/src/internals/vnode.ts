import type {
  ComponentChild,
  ComponentChildren,
  ComponentType,
  VNode,
} from "preact";
import { Fragment } from "preact";

import { DisplayStruct } from "../inspect.js";
import type { InternalPreactElement, InternalSource } from "../interfaces.js";
import { isProbablyVNode } from "../internals.js";
import type { InternalPreactComponent } from "./component.js";
import { InternalComponent } from "./component.js";

const BUILTINS = new Set<ComponentType>([Fragment]);

const INITIAL_ID = 0;

export class InternalVNode {
  readonly #delete = {
    parent: (): void => {
      delete this.#vnode[KEYS._parent];
    },

    depth: (): void => {
      delete this.#vnode[KEYS._depth];
    },
  } as const;

  readonly id: number;
  readonly #vnode: InternalPreactVNode;

  static #nextId = INITIAL_ID;

  static is(value: unknown): value is InternalVNode {
    return !!(
      value &&
      typeof value === "object" &&
      value instanceof InternalVNode
    );
  }

  static of(this: void, vnode: InternalPreactVNode): InternalVNode {
    return new InternalVNode(vnode);
  }

  static from(node: InternalVNode | InternalPreactVNode | VNode): InternalVNode;
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
    vnode: InternalVNode | InternalPreactVNode | VNode,
  ): InternalPreactVNode;
  static asPreact(
    vnode: IntoInternalVNode,
  ): InternalPreactVNode | null | undefined;
  static asPreact(
    vnode: IntoInternalVNode,
  ): InternalPreactVNode | null | undefined {
    if (InternalVNode.is(vnode)) {
      return vnode.#vnode;
    } else {
      return vnode as InternalPreactVNode;
    }
  }

  private constructor(vnode: InternalPreactVNode) {
    this.#vnode = vnode;
    this.id = InternalVNode.#nextId++;
  }

  get raw(): InternalPreactVNode {
    return this.#vnode;
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

  get children(): WrappedComponentChildren {
    const children = this.#vnode.props.children;

    return mapChildren(children, wrapVNodeChild);
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

  get vnodeChildren(): InternalVNode[] | undefined {
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

  get delete(): { readonly parent: () => void; readonly depth: () => void } {
    return this.#delete;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    let type: unknown = undefined;
    const internalType = this.#vnode.type;

    const childrenFields: Partial<{ vnodes: unknown; children: unknown }> = {};

    if (this.vnodeChildren) {
      childrenFields.vnodes = this.vnodeChildren.map((vnode) => vnode.id);
    }

    if (this.props.children) {
      childrenFields.children = mapChildren(this.props.children, (c) => {
        switch (typeof c) {
          case "string":
          case "number":
            return c;
          default:
            if (isProbablyVNode(c)) {
              return InternalVNode.of(c);
            } else {
              return c;
            }
        }
      });
    }

    if (internalType === Fragment) {
      type = "{Fragment}";
    } else if (typeof internalType === "string") {
      type = `<${internalType}>`;
    } else {
      type = internalType;
    }

    return DisplayStruct(
      `InternalVNode`,
      {
        type,
        ...childrenFields,
      },
      { description: this.id },
    );
  }

  processChildren(process: (prev: ComponentChild) => ComponentChild): boolean {
    const props = this.#vnode.props;
    const children = props.children;

    let updated = false;

    if (children) {
      if (Array.isArray(children)) {
        const out: ComponentChild[] = [];

        for (const child of children) {
          const processed = process(child as ComponentChild);
          out.push(processed);
          updated ||= processed !== child;
        }

        props.children = out;
      } else {
        props.children = process(children);
        updated = props.children !== children;
      }
    }

    return updated;
  }
}

export type IntoInternalVNode =
  | InternalVNode
  | InternalPreactVNode
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
  __source?: InternalSource | null | undefined;
  __self?: unknown;

  /** The parent DOM */
  __P?: InternalPreactElement | null | undefined;
  /** The component's owner */
  __o?: InternalPreactVNode | null | undefined;
  /** The component's children */
  __k: InternalPreactVNode[] | null;
  /** The component instance for this VNode */
  __c?: InternalPreactComponent | null | undefined;
  /** The parent VNode */
  __?: InternalPreactVNode | undefined;
  /** The DOM node for this VNode */
  __e?: Element | Text | undefined;
  /** The depth of the vnode */
  __b?: number | null | undefined;
  /**
   * Props that had Signal values before diffing (used after diffing to
   * subscribe)
   */
  __np?: Record<string, unknown> | null | undefined;
}

export function isUserspaceComponent(
  vnode: InternalPreactVNode | VNode,
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
  vnode: N,
): N["__c"] {
  return vnode.__c;
}

function mapChildren<T>(
  children: ComponentChildren,
  mapper: (child: ComponentChild) => T,
): T | T[] {
  if (Array.isArray(children)) {
    return children.map(mapper);
  } else {
    return mapper(children);
  }
}

type WrappedComponentChildren = WrappedComponentChild | WrappedComponentChild[];

type WrappedComponentChild =
  | Exclude<ComponentChild, VNode | InternalPreactVNode>
  | InternalVNode;

function wrapVNodeChild(child: ComponentChild): WrappedComponentChild {
  if (isProbablyVNode(child)) {
    return InternalVNode.of(child);
  } else {
    return child;
  }
}
