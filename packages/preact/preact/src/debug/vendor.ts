import { checkPropTypes } from "./check-props.js";
import { options, Component, type ComponentChildren, type VNode } from "preact";
import {
  ELEMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
} from "./constants.js";
import {
  getOwnerStack,
  setupComponentStack,
  getCurrentVNode,
  getDisplayName,
} from "./component-stack.js";
import {
  Augment,
  CATCH_ERROR,
  deleteDepth,
  deleteParent,
  DIFF,
  getChildren,
  getComponent,
  getDOM,
  getParent,
  getParentDOM,
  getVNode,
  HOOK,
  ROOT,
  setSelf,
  setSource,
  type InternalComponent,
  type InternalSource,
  type InternalVNode,
} from "../internals.js";

const isWeakMapSupported = typeof WeakMap == "function";

function getClosestDomNodeParent(parent: InternalVNode | undefined): any {
  if (!parent) return {};
  if (typeof parent.type === "function") {
    return getClosestDomNodeParent(getParent(parent));
  }
  return parent;
}

export function initDebug(): void {
  setupComponentStack();

  let hooksAllowed = false;

  const augment = new Augment(options);

  const warnedComponents = {
    useEffect: new WeakMap(),
    useLayoutEffect: new WeakMap(),
    lazyPropTypes: new WeakMap(),
  };

  const deprecations: unknown[] = [];

  augment.hook(CATCH_ERROR, (error, vnode, oldVNode, errorInfo) => {
    const component = vnode && getComponent(vnode);
    if (component && isPromiseLike(error)) {
      const promise = error;
      error = new Error(
        `Missing Suspense. The throwing component was: ${getDisplayName(vnode)}`
      );

      let parent: InternalVNode | undefined = vnode;
      for (; parent; parent = getParent(parent)) {
        const component = getComponent(parent);
        if (component?._childDidSuspend) {
          error = promise;
          break;
        }
      }

      // We haven't recovered and we know at this point that there is no
      // Suspense component higher up in the tree
      if (error instanceof Error) {
        throw error;
      }
    }

    try {
      errorInfo = errorInfo || {};
      errorInfo.componentStack = getOwnerStack(vnode);
      augment.original(CATCH_ERROR)?.(error, vnode, oldVNode, errorInfo);

      // when an error was handled by an ErrorBoundary we will nontheless emit an error
      // event on the window object. This is to make up for react compatibility in dev mode
      // and thus make the Next.js dev overlay work.
      if (!isPromiseLike(error)) {
        setTimeout(() => {
          throw error;
        });
      }

      return false;
    } catch (e) {
      throw e;
    }
  });

  augment.hook(ROOT, (vnode, parentNode) => {
    if (!parentNode) {
      throw new Error(
        "Undefined parent passed to render(), this is the second argument.\n" +
          "Check if the element is available in the DOM/has the correct id."
      );
    }

    let isValid;
    switch (parentNode.nodeType) {
      case ELEMENT_NODE:
      case DOCUMENT_FRAGMENT_NODE:
      case DOCUMENT_NODE:
        isValid = true;
        break;
      default:
        isValid = false;
    }

    if (!isValid) {
      const componentName = getDisplayName(vnode);
      throw new Error(
        `Expected a valid HTML node as a second argument to render.	Received ${parentNode} instead: render(<${componentName} />, ${parentNode});`
      );
    }
  });

  augment.hook(DIFF, (vnode) => {
    const { type } = vnode;
    const parent = getParent(vnode);
    const parentVNode = getClosestDomNodeParent(parent);

    hooksAllowed = true;

    if (type === undefined) {
      throw new Error(
        "Undefined component passed to createElement()\n\n" +
          "You likely forgot to export your component or might have mixed up default and named imports" +
          serializeVNode(vnode) +
          `\n\n${getOwnerStack(vnode)}`
      );
    } else if (type != null && typeof type == "object") {
      if (getChildren(type) !== undefined && getDOM(type) !== undefined) {
        throw new Error(
          `Invalid type passed to createElement(): ${type}\n\n` +
            "Did you accidentally pass a JSX literal as JSX twice?\n\n" +
            `  let My${getDisplayName(vnode)} = ${serializeVNode(type)};\n` +
            `  let vnode = <My${getDisplayName(vnode)} />;\n\n` +
            "This usually happens when you export a JSX literal and not the component." +
            `\n\n${getOwnerStack(vnode)}`
        );
      }

      throw new Error(
        "Invalid type passed to createElement(): " +
          (Array.isArray(type) ? "array" : type)
      );
    }

    if (
      (type === "thead" || type === "tfoot" || type === "tbody") &&
      parentVNode.type !== "table"
    ) {
      console.error(
        "Improper nesting of table. Your <thead/tbody/tfoot> should have a <table> parent." +
          serializeVNode(vnode) +
          `\n\n${getOwnerStack(vnode)}`
      );
    } else if (
      type === "tr" &&
      parentVNode.type !== "thead" &&
      parentVNode.type !== "tfoot" &&
      parentVNode.type !== "tbody" &&
      parentVNode.type !== "table"
    ) {
      console.error(
        "Improper nesting of table. Your <tr> should have a <thead/tbody/tfoot/table> parent." +
          serializeVNode(vnode) +
          `\n\n${getOwnerStack(vnode)}`
      );
    } else if (type === "td" && parentVNode.type !== "tr") {
      console.error(
        "Improper nesting of table. Your <td> should have a <tr> parent." +
          serializeVNode(vnode) +
          `\n\n${getOwnerStack(vnode)}`
      );
    } else if (type === "th" && parentVNode.type !== "tr") {
      console.error(
        "Improper nesting of table. Your <th> should have a <tr>." +
          serializeVNode(vnode) +
          `\n\n${getOwnerStack(vnode)}`
      );
    }

    if (
      vnode.ref !== undefined &&
      typeof vnode.ref != "function" &&
      typeof vnode.ref != "object" &&
      !("$$typeof" in vnode) // allow string refs when preact-compat is installed
    ) {
      throw new Error(
        `Component's "ref" property should be a function, or an object created ` +
          `by createRef(), but got [${typeof vnode.ref}] instead\n` +
          serializeVNode(vnode) +
          `\n\n${getOwnerStack(vnode)}`
      );
    }

    if (typeof vnode.type == "string") {
      for (const key in vnode.props) {
        if (
          key[0] === "o" &&
          key[1] === "n" &&
          typeof vnode.props[key] != "function" &&
          vnode.props[key] != null
        ) {
          throw new Error(
            `Component's "${key}" property should be a function, ` +
              `but got [${typeof vnode.props[key]}] instead\n` +
              serializeVNode(vnode) +
              `\n\n${getOwnerStack(vnode)}`
          );
        }
      }
    }

    // Check prop-types if available
    // @ts-expect-error TODO: add prop-types to types
    if (typeof vnode.type == "function" && vnode.type.propTypes) {
      if (
        vnode.type.displayName === "Lazy" &&
        warnedComponents &&
        !warnedComponents.lazyPropTypes.has(vnode.type)
      ) {
        const m =
          "PropTypes are not supported on lazy(). Use propTypes on the wrapped component itself. ";
        try {
          // @ts-expect-error TODO
          const lazyVNode = vnode.type();
          warnedComponents.lazyPropTypes.set(vnode.type, true);
          console.warn(
            m + `Component wrapped in lazy() is ${getDisplayName(lazyVNode)}`
          );
        } catch (promise) {
          console.warn(
            m + "We will log the wrapped component's name once it is loaded."
          );
        }
      }

      let values = vnode.props;
      // @ts-expect-error TODO: add vnode.type to types
      if (vnode.type._forwarded) {
        values = { ...values };
        delete values.ref;
      }

      checkPropTypes(
        // @ts-expect-error TODO: add prop-types to types
        vnode.type.propTypes,
        values,
        "prop",
        getDisplayName(vnode),
        () => getOwnerStack(vnode)
      );
    }
  });

  augment.hook(HOOK, (component, index, type) => {
    if (!component || !hooksAllowed) {
      throw new Error("Hook can only be invoked from render methods.");
    }
  });

  // Ideally we'd want to print a warning once per component, but we
  // don't have access to the vnode that triggered it here. As a
  // compromise and to avoid flooding the console with warnings we
  // print each deprecation warning only once.
  const warn = (property: string, message: string) => ({
    get() {
      const key = "get" + property + message;
      if (deprecations && deprecations.indexOf(key) < 0) {
        deprecations.push(key);
        console.warn(`getting vnode.${property} is deprecated, ${message}`);
      }
    },
    set() {
      const key = "set" + property + message;
      if (deprecations && deprecations.indexOf(key) < 0) {
        deprecations.push(key);
        console.warn(`setting vnode.${property} is not allowed, ${message}`);
      }
    },
  });

  const deprecatedAttributes = {
    nodeName: warn("nodeName", "use vnode.type"),
    attributes: warn("attributes", "use vnode.props"),
    children: warn("children", "use vnode.props.children"),
  };

  const deprecatedProto = Object.create({}, deprecatedAttributes);

  type AnyProps = Record<PropertyKey, unknown> & {
    children?: ComponentChildren;
  };

  augment.hook("vnode", (vnode) => {
    const props: AnyProps = vnode.props;
    if (
      vnode.type !== null &&
      props != null &&
      ("__source" in props || "__self" in props)
    ) {
      const newProps: AnyProps = (vnode.props = {} as VNode["props"]);
      for (const [i, v] of Object.entries(props)) {
        if (i === "__source")
          setSource(vnode, v as InternalSource | null | undefined);
        else if (i === "__self") setSelf(vnode, v);
        else newProps[i] = v;
      }
    }

    Object.setPrototypeOf(vnode, deprecatedProto);
  });

  augment.hook("diffed", (vnode) => {
    // Check if the user passed plain objects as children. Note that we cannot
    // move this check into `options.vnode` because components can receive
    // children in any shape they want (e.g.
    // `<MyJSONFormatter>{{ foo: 123, bar: "abc" }}</MyJSONFormatter>`).
    // Putting this check in `options.diffed` ensures that
    // `vnode._children` is set and that we only validate the children
    // that were actually rendered.
    const children = getChildren(vnode);

    if (children) {
      children.forEach((child) => {
        if (child && child.type === undefined) {
          // Remove internal vnode keys that will always be patched
          deleteParent(child);
          deleteDepth(child);
          const keys = Object.keys(child).join(",");
          throw new Error(
            `Objects are not valid as a child. Encountered an object with the keys {${keys}}.` +
              `\n\n${getOwnerStack(vnode)}`
          );
        }
      });
    }

    hooksAllowed = false;

    augment.original("diffed")?.(vnode);

    if (Array.isArray(children)) {
      children.reduce((keys, child) => {
        if (!child || child.key == null) return keys;

        const key: unknown = child.key;
        if (keys.has(key)) {
          console.error(
            "Following component has two or more children with the " +
              `same key attribute: "${key}". This may cause glitches and misbehavior ` +
              "in rendering process. Component: \n\n" +
              serializeVNode(vnode) +
              `\n\n${getOwnerStack(vnode)}`
          );
        } else {
          keys.add(key);
        }

        return keys;
      }, new Set<unknown>());
    }

    return false;
  });
}

const setState = Component.prototype.setState;
Component.prototype.setState = function (
  this: InternalComponent,
  update,
  callback
) {
  if (getVNode(this) === null) {
    // `this._vnode` will be `null` during componentWillMount. But it
    // is perfectly valid to call `setState` during cWM. So we
    // need an additional check to verify that we are dealing with a
    // call inside constructor.
    if (this.state == null) {
      const currentVNode = getCurrentVNode();
      console.warn(
        `Calling "this.setState" inside the constructor of a component is a ` +
          `no-op and might be a bug in your application. Instead, set ` +
          `"this.state = {}" directly.\n\n${getOwnerStack(currentVNode)}`
      );
    }
  }

  return setState.call(this, update, callback);
};

const forceUpdate = Component.prototype.forceUpdate;
Component.prototype.forceUpdate = function (this: InternalComponent, callback) {
  const vnode = getVNode(this);
  if (vnode == null) {
    console.warn(
      `Calling "this.forceUpdate" inside the constructor of a component is a ` +
        `no-op and might be a bug in your application.\n\n${getOwnerStack(
          getCurrentVNode()
        )}`
    );
  } else if (getParentDOM(this) == null) {
    console.warn(
      `Can't call "this.forceUpdate" on an unmounted component. This is a no-op, ` +
        `but it indicates a memory leak in your application. To fix, cancel all ` +
        `subscriptions and asynchronous tasks in the componentWillUnmount method.` +
        `\n\n${getOwnerStack(getVNode(this))}`
    );
  }
  return forceUpdate.call(this, callback);
};

/**
 * Serialize a vnode tree to a string
 * @param vnode
 */
export function serializeVNode(vnode: InternalVNode): string {
  const { props } = vnode;
  const name = getDisplayName(vnode);

  let attrs = "";
  for (const prop in props) {
    if (props.hasOwnProperty(prop) && prop !== "children") {
      let value = props[prop];

      // If it is an object but doesn't have toString(), use Object.toString
      if (typeof value == "function") {
        value = `function ${value.displayName || value.name}() {}`;
      }

      value =
        Object(value) === value && !value.toString
          ? Object.prototype.toString.call(value)
          : value + "";

      attrs += ` ${prop}=${JSON.stringify(value)}`;
    }
  }

  const children = props.children;
  return `<${name}${attrs}${
    children && children.length ? ">..</" + name + ">" : " />"
  }`;
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return !!(isObject(value) && typeof value["then"] == "function");
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === "object";
}
