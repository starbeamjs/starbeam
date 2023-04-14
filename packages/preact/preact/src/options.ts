import type {
  InternalComponent,
  InternalElement,
} from "@starbeam/preact-utils";
import { Plugin } from "@starbeam/preact-utils";
import { DEBUG, isReactive } from "@starbeam/reactive";
import { CONTEXT, RUNTIME } from "@starbeam/runtime";
import type { ComponentType } from "preact";

import { ComponentFrame } from "./frame.js";

export const STARBEAM = Symbol("STARBEAM");

export function getCurrentComponent(): InternalComponent {
  return ComponentFrame.current;
}

export const install = Plugin((on) => {
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

    console.log("willRender", componentName(component.fn));

    CONTEXT.app = getRoot(component);

    ComponentFrame.start(
      component,
      DEBUG?.Desc(
        "formula",
        componentName(component.fn),
        "preact.componentWillRender"
      )
    );
  });

  on.component.didRender((component) => {
    if (ComponentFrame.isRenderingComponent(component)) {
      ComponentFrame.end(component, () => {
        component.notify();
      });
    }
  });

  on.component.beforePaint((component) => {
    component.run("prePaint");
  });

  on.component.afterPaint((component) => {
    component.run("postPaint");
  });

  on.component.unmount((component) => {
    ComponentFrame.unmount(component);
    RUNTIME.finalize(component);
  });
});

function componentName(component: ComponentType<unknown> | string): string {
  if (typeof component === "string") {
    return component;
  } else {
    return component.name;
  }
}

export function getRoot(component: InternalComponent): InternalComponent {
  return component.context[STARBEAM] as InternalComponent;
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
