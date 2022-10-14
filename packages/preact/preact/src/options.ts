import { Plugin } from "@starbeam/preact-utils";
import { Reactive } from "@starbeam/timeline";
import { descriptionFrom } from "@starbeam/debug";
import { ComponentFrame } from "./frame.js";

export const setup = Plugin((on) => {
  on.vnode((vnode) => {
    vnode.processChildren((child) => {
      if (Reactive.is(child)) {
        return String(child.read());
      } else {
        return child;
      }
    });
  });

  on.component.render((component) => {
    ComponentFrame.start(
      component,
      descriptionFrom({
        api: "preact",
        type: "implementation",
      })
    );
  });

  on.component.diffed((component) => {
    ComponentFrame.end(component, () => {
      component.notify();
    });
  });

  on.component.unmount((component) => {
    ComponentFrame.unmount(component);
  });
});
