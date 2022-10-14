import type { Component } from "preact";
import type { InternalEffect, InternalPreactElement } from "../interfaces.js";
import { InternalVNode, type InternalPreactVNode } from "./vnode.js";

const COMPONENTS = new WeakMap<InternalPreactComponent, InternalComponent>();

export class InternalComponent {
  static is(value: unknown): value is InternalComponent {
    return !!(
      value &&
      typeof value === "object" &&
      value instanceof InternalComponent
    );
  }

  static from(
    component: InternalPreactComponent | InternalComponent | null | undefined
  ): InternalComponent | null | undefined {
    if (InternalComponent.is(component)) {
      return component;
    } else if (component) {
      return InternalComponent.of(component);
    } else {
      return component;
    }
  }

  static of(component: InternalPreactComponent): InternalComponent {
    if (component == null) {
      throw Error(`unexpected nconst COMPONENTS = new WeakMap<InternalPreactComponent, InternalComponent>();
      ull component`);
    }
    let wrapper = COMPONENTS.get(component);

    if (!wrapper) {
      wrapper = new InternalComponent(component);
      COMPONENTS.set(component, wrapper);
    }

    return wrapper;
  }

  readonly #component: InternalPreactComponent;

  private constructor(component: InternalPreactComponent) {
    this.#component = component;
  }

  get props(): InternalPreactComponent["props"] {
    return this.#component.props;
  }

  get state(): InternalPreactComponent["state"] {
    return this.#component.state;
  }

  get vnode(): InternalVNode {
    return InternalVNode.of(this.#component[KEYS._vnode]);
  }

  get parentDOM(): InternalPreactElement | undefined | null {
    return this.#component[KEYS._parentDom];
  }

  get updater(): InternalEffect | undefined {
    return this.#component[KEYS["signals._updater"]];
  }

  get updateFlags(): number {
    return this.#component[KEYS["signals._updateFlags"]];
  }

  notify(): void {
    this.#component.forceUpdate();
  }
}

const KEYS = {
  _vnode: "__v",
  _parentDom: "__P",
  "signals._updater": "__$u",
  "signals._updateFlags": "__$f",
} as const;

export interface InternalPreactComponent extends Component<unknown, unknown> {
  /** the vnode */
  __v: InternalPreactVNode;
  /** the parent DOM */
  __P?: InternalPreactElement | null;
  __$u?: InternalEffect;
  __$f: number;
  __c?: boolean;
}
