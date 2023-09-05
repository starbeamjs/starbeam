import { objectHasKeys } from "@starbeam/core-utils";
import type { Component, ComponentType } from "preact";

import { DisplayStruct } from "../inspect.js";
import type { InternalEffect, InternalPreactElement } from "../interfaces.js";
import { type InternalPreactVNode, InternalVNode } from "./vnode.js";

const COMPONENTS = new WeakMap<InternalPreactComponent, InternalComponent>();
const INITIAL_ID = 0;

interface Handlers {
  prePaint: Set<() => void>;
  postPaint: Set<() => void>;
}

export class InternalComponent {
  readonly #component: InternalPreactComponent;
  readonly id: number;

  static #nextId = INITIAL_ID;

  static is(value: unknown): value is InternalComponent {
    return !!(
      value &&
      typeof value === "object" &&
      value instanceof InternalComponent
    );
  }

  static from(
    component: InternalPreactComponent | InternalComponent | null | undefined,
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
    let wrapper = COMPONENTS.get(component);

    if (!wrapper) {
      wrapper = new InternalComponent(component);
      COMPONENTS.set(component, wrapper);
    }

    return wrapper;
  }

  readonly #handlers: Handlers = {
    prePaint: new Set(),
    postPaint: new Set(),
  };

  private constructor(component: InternalPreactComponent) {
    this.#component = component;
    this.id = InternalComponent.#nextId++;
  }

  readonly on = {
    idle: (fn: () => void): void => void this.#handlers.postPaint.add(fn),
    layout: (fn: () => void): void => void this.#handlers.prePaint.add(fn),
  };

  run(phase: keyof Handlers): void {
    this.#handlers[phase].forEach((fn) => void fn());
  }

  get lifetime(): InternalPreactComponent {
    return this.#component;
  }

  get fn(): ComponentType<unknown> | string {
    return this.vnode.type as ComponentType<unknown> | string;
  }

  get props(): InternalPreactComponent["props"] {
    return this.#component.props;
  }

  get state(): InternalPreactComponent["state"] {
    return this.#component.state;
  }

  get context(): Record<PropertyKey, unknown> {
    const context = this.#component.context as unknown;

    if (typeof context !== "object" || context === null) {
      throw Error(
        `UNEXPECTED: Expected context to be an object, got ${
          context === null ? "null" : typeof context
        }`,
      );
    }

    return context as Record<PropertyKey, unknown>;
  }

  set context(value: unknown) {
    this.#component.context = value;
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

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const propsFields: Partial<{ props: unknown }> = {};
    const stateFields: Partial<{ state: unknown }> = {};

    if (objectHasKeys(this.#component.props)) {
      propsFields.props = this.#component.props;
    }

    if (objectHasKeys(this.#component.state)) {
      stateFields.state = this.#component.state;
    }

    return DisplayStruct(
      "InternalComponent",
      {
        vnode: this.vnode,
        context: this.context,
        ...propsFields,
        ...stateFields,
      },
      { description: String(this.id) },
    );
  }

  notify = (): void => void this.#component.forceUpdate();
}

const KEYS = {
  _vnode: "__v",
  _parentDom: "__P",
  _parent: "__",
  "signals._updater": "__$u",
  "signals._updateFlags": "__$f",
} as const;

export interface InternalPreactComponent extends Component<unknown, unknown> {
  /** the vnode */
  __v: InternalPreactVNode;
  /** the parent DOM */
  __P?: InternalPreactElement | null;
  __?: InternalPreactComponent;
  __$u?: InternalEffect;
  __$f: number;
  __c?: boolean;
}
