import {
  type ComponentChild,
  type ComponentChildren,
  type Options,
} from "preact";
import { debugComponent, debugVNode } from "./debug.js";
import {
  Augment,
  CATCH_ERROR,
  DIFF,
  HOOK,
  RENDER,
  type InternalComponent,
  type InternalVNode,
} from "./internals.js";
import { Reactive } from "@starbeam/timeline";

export function setup(options: Options): void {
  const augment = new Augment(options as any);

  augment.hook("vnode", (vnode) => {
    if (vnode.props.children) {
      vnode.props.children = mapChildren(vnode.props.children);
    }
    debug("vnode", debugVNode(vnode));
  });

  augment.hook(HOOK, (component, index, type) => {
    debug("HOOK", {
      component: debugComponent(component as InternalComponent),
      index,
      type,
    });
  });

  augment.hook(RENDER, (vnode) => {
    debug("RENDER", debugVNode(vnode));
    const component = vnode.__c;

    if (component) {
    }
  });

  augment.hook(DIFF, (vnode) => {
    debug("DIFF", debugVNode(vnode));
  });

  augment.hook("diffed", (vnode) => {
    debug("diffed", debugVNode(vnode as InternalVNode));
  });

  augment.hook(CATCH_ERROR, (error, vnode, oldVNode) => {
    debug("CATCH_ERROR", error);
  });

  augment.hook("unmount", (vnode) => {
    debug("UNMOUNT", debugVNode(vnode as InternalVNode));
  });
}

function debug(hook: string, debug?: unknown) {
  if (debug === undefined) {
    console.log(hook);
  } else {
    console.group(hook);
    console.dir(debug, { depth: null });
    console.groupEnd();
    console.log("");
  }
}

function mapChildren(children: ComponentChildren): ComponentChildren {
  if (Array.isArray(children)) {
    return children.map(mapChild);
  } else {
    return mapChild(children);
  }
}

function mapChild(child: ComponentChild): ComponentChild {
  if (Reactive.is(child)) {
    return String(child.read());
  } else {
    return child;
  }
}
