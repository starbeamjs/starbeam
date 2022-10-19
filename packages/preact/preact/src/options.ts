import { descriptionFrom } from "@starbeam/debug";
import { Plugin } from "@starbeam/preact-utils";
import { CONTEXT, LIFETIME, Reactive } from "@starbeam/timeline";
import type { ComponentType } from "preact";

import { ComponentFrame } from "./frame.js";

const CURRENT_COMPONENT: object[] = [];

export function getCurrentComponent(): object | undefined {
  if (CURRENT_COMPONENT.length === 0) {
    return undefined;
  } else {
    return CURRENT_COMPONENT[CURRENT_COMPONENT.length - 1];
  }
}

export const setup = Plugin((on) => {
  on.root((vnode, parent) => {
    debug("root", vnode);
    // FIXME: Support multiple roots on the same page
    CONTEXT.app = parent;
  });

  on.vnode((vnode) => {
    debug("vnode", vnode.props.children);

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
    CONTEXT.component.push(component);
    debug("willRender", component);
    CURRENT_COMPONENT.push(component);

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
      CONTEXT.component.pop();
      ComponentFrame.end(component, () => {
        component.notify();
      });
      CURRENT_COMPONENT.pop();
    }
  });

  on.component.unmount((component) => {
    debug("unmount", component);

    ComponentFrame.unmount(component);
    LIFETIME.finalize(component);
  });
});

function componentName(component: ComponentType<unknown> | string) {
  if (typeof component === "string") {
    return component;
  } else {
    return component.name;
  }
}

async function Debug(): Promise<(name: string, value: unknown) => void> {
  if (false) {
    return (name, value) => {
      console.log(name, value);
      // console.group(name);
      // console.debug(value);
      // console.groupEnd();
    };
  } else if (import.meta.env.STARBEAM_TRACE) {
    const createRequire = (await import("node:module")).Module.createRequire;
    const require = createRequire(import.meta.url);
    const inspect = require("util").inspect as typeof import("util").inspect;
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

const debug = await Debug();
