import { options, Fragment } from "preact";
import {
  Augment,
  DIFF,
  getOwner,
  RENDER,
  ROOT,
  setOwner,
  type InternalVNode,
} from "../internals.js";

/**
 * Get human readable name of the component/dom node
 * @param {import('./internal').VNode} vnode
 * @param {import('./internal').VNode} vnode
 * @returns {string}
 */
export function getDisplayName(vnode: InternalVNode): string {
  if (vnode.type === Fragment) {
    return "Fragment";
  } else if (typeof vnode.type == "function") {
    return vnode.type.displayName || vnode.type.name;
  } else if (typeof vnode.type == "string") {
    return vnode.type;
  }

  return "#text";
}

/**
 * Used to keep track of the currently rendered `vnode` and print it
 * in debug messages.
 */
const renderStack: InternalVNode[] = [];

/**
 * Keep track of the current owners. An owner describes a component
 * which was responsible to render a specific `vnode`. This exclude
 * children that are passed via `props.children`, because they belong
 * to the parent owner.
 *
 * ```jsx
 * const Foo = props => <div>{props.children}</div> // div's owner is Foo
 * const Bar = props => {
 *   return (
 *     <Foo><span /></Foo> // Foo's owner is Bar, span's owner is Bar
 *   )
 * }
 * ```
 *
 * Note: A `vnode` may be hoisted to the root scope due to compiler
 * optimiztions. In these cases the `_owner` will be different.
 */
let ownerStack: InternalVNode[] = [];

/**
 * Get the currently rendered `vnode`
 * @returns {import('./internal').VNode | null}
 */
export function getCurrentVNode(): InternalVNode | null {
  return renderStack.length > 0 ? renderStack[renderStack.length - 1] : null;
}

/**
 * If the user doesn't have `@babel/plugin-transform-react-jsx-source`
 * somewhere in his tool chain we can't print the filename and source
 * location of a component. In that case we just omit that, but we'll
 * print a helpful message to the console, notifying the user of it.
 */
let hasBabelPlugin = false;

/**
 * Check if a `vnode` is a possible owner.
 * @param {import('./internal').VNode} vnode
 */
function isPossibleOwner(vnode: InternalVNode) {
  return typeof vnode.type == "function" && vnode.type != Fragment;
}

/**
 * Return the component stack that was captured up to this point.
 * @param {import('./internal').VNode} vnode
 * @returns {string}
 */
export function getOwnerStack(vnode: InternalVNode | null): string {
  if (vnode === null) {
    return "";
  }

  const stack = [vnode];
  let owner = getOwner(vnode);

  while (owner != null) {
    stack.push(owner);
    owner = getOwner(owner);
  }

  return stack.reduce((acc, owner) => {
    acc += `  in ${getDisplayName(owner)}`;

    const source = owner.__source;
    if (source) {
      acc += ` (at ${source.fileName}:${source.lineNumber})`;
    } else if (!hasBabelPlugin) {
      hasBabelPlugin = true;
      console.warn(
        "Add @babel/plugin-transform-react-jsx-source to get a more detailed component stack. Note that you should not add it to production builds of your App for bundle size reasons."
      );
    }

    return (acc += "\n");
  }, "");
}

/**
 * Setup code to capture the component trace while rendering. Note that
 * we cannot simply traverse `vnode._parent` upwards, because we have some
 * debug messages for `this.setState` where the `vnode` is `undefined`.
 */
export function setupComponentStack(): void {
  const augment = new Augment(options);

  augment.hook("diffed", (vnode) => {
    if (isPossibleOwner(vnode)) {
      ownerStack.pop();
    }
    renderStack.pop();
  });

  augment.hook(DIFF, (vnode) => {
    if (isPossibleOwner(vnode)) {
      renderStack.push(vnode);
    }
  });

  augment.hook(ROOT, (vnode, parent) => {
    ownerStack = [];
  });

  augment.hook("vnode", (vnode) => {
    setOwner(
      vnode,
      ownerStack.length > 0 ? ownerStack[ownerStack.length - 1] : null
    );
  });

  augment.hook(RENDER, (vnode) => {
    if (isPossibleOwner(vnode)) {
      ownerStack.push(vnode);
    }
  });
}
