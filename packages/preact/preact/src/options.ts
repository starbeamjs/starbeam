import { descriptionFrom } from "@starbeam/debug";
import type {
  InternalComponent,
  InternalElement,
} from "@starbeam/preact-utils";
import { Plugin } from "@starbeam/preact-utils";
import { CONTEXT, isReactive, LIFETIME } from "@starbeam/timeline";
import type { ComponentType } from "preact";

import { ComponentFrame } from "./frame.js";

const STARBEAM = Symbol("STARBEAM");

export function getCurrentComponent(): InternalComponent {
  return ComponentFrame.current;
}

export const setup = Plugin((on) => {
  on.root((_, parent) => {
    ROOTS.current = parent;
  });

  on.vnode((vnode) => {
    vnode.processChildren((child) => {
      if (isReactive(child)) {
        return String(child.read());
      } else {
        return child;
      }
    });
  });

  on.component.willRender((component) => {
    if (ROOTS.current) {
      ROOTS.claim(component);
      component.context[STARBEAM] = component;
    }

    CONTEXT.app = component.context[STARBEAM] as InternalComponent;

    ComponentFrame.start(
      component,
      descriptionFrom({
        api: "preact",
        type: "implementation",
        fromUser: componentName(component.fn),
      })
    );
  });

  on.component.didRender((component) => {
    if (ComponentFrame.isRenderingComponent(component)) {
      ComponentFrame.end(component, () => {
        component.notify();
      });
    }
  });

  on.component.unmount((component) => {
    ComponentFrame.unmount(component);
    LIFETIME.finalize(component);
  });
});

function componentName(component: ComponentType<unknown> | string): string {
  if (typeof component === "string") {
    return component;
  } else {
    return component.name;
  }
}

class Roots {
  readonly #apps = new WeakMap<InternalElement, InternalComponent>();
  readonly #roots = new WeakSet<InternalComponent>();
  #current: InternalElement | undefined;

  claim(component: InternalComponent): InternalComponent {
    if (!this.#current) {
      throw Error(`UNEXPECTED: No current root element`);
    }

    this.set(this.#current, component);
    this.#current = undefined;
    return component;
  }

  set current(value: InternalElement | undefined) {
    this.#current = value;
  }

  get current(): InternalElement | undefined {
    return this.#current;
  }

  hasComponent(component: InternalComponent): boolean {
    return this.#roots.has(component);
  }

  hasElement(element: InternalElement): boolean {
    return this.#apps.has(element);
  }

  get(element: InternalElement): InternalComponent | undefined {
    return this.#apps.get(element);
  }

  set(element: InternalElement, component: InternalComponent): void {
    this.#apps.set(element, component);
    this.#roots.add(component);
  }
}

const ROOTS = new Roots();
