import { Plugin } from "@starbeam/preact-utils";
import { LIFETIME, Reactive } from "@starbeam/timeline";
import { descriptionFrom } from "@starbeam/debug";
import { ComponentFrame } from "./frame.js";
import { createRequire } from "node:module";

const CURRENT_COMPONENT: object[] = [];

export function getCurrentComponent(): object | undefined {
  if (CURRENT_COMPONENT.length === 0) {
    return undefined;
  } else {
    return CURRENT_COMPONENT[CURRENT_COMPONENT.length - 1];
  }
}

export const setup = Plugin((on) => {
  console.groupEnd();
  on.vnode((vnode) => {
    debug("vnode", vnode);

    const updated = vnode.processChildren((child) => {
      if (Reactive.is(child)) {
        return String(child.read());
      } else {
        return child;
      }
    });

    if (updated) {
      debug("vnode:update", vnode);
    }
  });

  on.diff((_component) => {
    // debug("diff", component);
  });

  on.component.willRender((component) => {
    debug("willRender", component);
    CURRENT_COMPONENT.push(component);
    ComponentFrame.start(
      component,
      descriptionFrom({
        api: "preact",
        type: "implementation",
      })
    );
  });

  on.component.didRender((component) => {
    ComponentFrame.end(component, () => {
      component.notify();
    });
    CURRENT_COMPONENT.pop();

    debug("didRender", component);
  });

  on.component.unmount((component) => {
    ComponentFrame.unmount(component);
    LIFETIME.finalize(component);
  });
});

async function Debug(): Promise<(name: string, value: unknown) => void> {
  if (import.meta.env.STARBEAM_TRACE) {
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
