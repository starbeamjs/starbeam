import { descriptionFrom } from "@starbeam/debug";
import type { InternalComponent } from "@starbeam/preact-utils";
import { Plugin } from "@starbeam/preact-utils";
import type { InternalElement } from "@starbeam/preact-utils/src/internals/elements.js";
import { CONTEXT, LIFETIME, Reactive } from "@starbeam/timeline";
import type { ComponentType } from "preact";

import { ComponentFrame } from "./frame.js";

const STARBEAM = Symbol("STARBEAM");

export function getCurrentComponent(): InternalComponent {
  return ComponentFrame.current;
}

export const setup = Plugin((on) => {
  on.root((vnode, parent) => {
    debug("root", { vnode, parent, raw: vnode.raw });
    ROOTS.current = parent;
  });

  on.unroot((parent) => {
    debug("unroot", { parent, component: ROOTS.get(parent) });
  });

  on.vnode((vnode) => {
    debug(`vnode [${vnode.id}]`, {
      type: vnode.type,
      children: vnode.children,
    });

    const updated = vnode.processChildren((child) => {
      if (Reactive.is(child)) {
        return String(child.read());
      } else {
        return child;
      }
    });

    if (updated) {
      debug("vnode:update", vnode.props.children);
    }
  });

  on.diff((component) => {
    debug("diff", component);
  });

  on.component.willRender((component) => {
    if (ROOTS.current) {
      ROOTS.claim(component);
      component.context[STARBEAM] = component;
    }

    debug("willRender", { component });
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
    debug("didRender", component);

    if (ComponentFrame.isRenderingComponent(component)) {
      ComponentFrame.end(component, () => {
        component.notify();
      });
    }
  });

  on.component.unmount((component) => {
    debug("unmount", { component, vnode: component.vnode });

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

async function Debug(): Promise<(name: string, value: unknown) => void> {
  const Module = (await import("node:module")).Module;
  const require = Module.createRequire(import.meta.url);
  const inspect = (require("util") as typeof import("util")).inspect;
  const chalk = (await import("chalk")).default;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (false) {
    return (name, value) => {
      console.log(
        chalk.magenta(name),
        inspect(value, { customInspect: true, depth: null })
      );
      // console.group(name);
      // console.debug(value);
      // console.groupEnd();
    };
  } else if (import.meta.env.STARBEAM_TRACE) {
    const Module = (await import("node:module")).Module;
    const require = Module.createRequire(import.meta.url);
    const inspect = (require("util") as typeof import("util")).inspect;
    const chalk = (await import("chalk")).default;

    return (name: string, value: unknown): void => {
      console.log(`${chalk.cyan(`> `)}${chalk.cyan.underline(name)}`);

      const inspected = inspect(value, {
        depth: Infinity,
        colors: true,
        customInspect: true,
      });

      if (inspected.includes("\n")) {
        console.log(
          inspected
            .split("\n")
            .map((line) => `  ${chalk.dim("|")} ${chalk.dim(line)}`)
            .join("\n") + "\n"
        );
      } else {
        console.log(`  ${chalk.dim(inspected)}\n`);
      }
    };
  } else {
    return () => {
      /* noop */
    };
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

const debug = await Debug();
