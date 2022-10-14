import type { ComponentChild, ComponentChildren } from "preact";
import {
  getVNode,
  isProbablyVNode,
  type InternalComponent,
  type InternalVNode,
} from "./internals.js";

export function debugComponentChild(child: ComponentChild): unknown {
  if (isProbablyVNode(child)) {
    return debugVNode(child);
  } else {
    return child;
  }
}

export function debugVNode(
  vnode: InternalVNode | undefined | null
): object | undefined | null {
  if (vnode) {
    const { type, __e: element, props: props } = vnode;

    if (typeof props === "string") {
      return DisplayStruct("Text", { data: props });
    }

    const updatedProps = propFields(props);

    const typeField = typeof type === "string" ? {} : { type: type };
    const structOptions =
      typeof type === "string" ? { description: type } : undefined;

    const propsField =
      Object.keys(updatedProps).length === 0 ? {} : { props: updatedProps };

    return DisplayStruct(
      "VNode",
      {
        ...typeField,
        ...elementFields(element),
        ...propsField,
      },
      structOptions
    );
  } else {
    return vnode;
  }
}

export function debugComponent(component: InternalComponent): unknown {
  return DisplayStruct("Component", {
    props: mapProps(component.props),
    state: component.state,
    vnode: debugVNode(getVNode(component)),
  });
}

function elementFields(element: Element | Text | undefined): object {
  if (!element) {
    return {};
  } else if (element instanceof Text) {
    return DisplayStruct("Text", { data: element.textContent });
  } else {
    const truncated = document.createElement(element.tagName);

    for (const attr of element.attributes) {
      truncated.setAttribute(attr.name, attr.value);
    }

    return truncated;
  }
}

function propFields(
  props: { children?: ComponentChildren } | undefined
): object {
  if (!props) {
    return {};
  }

  const children = props.children;

  const updatedProps = props
    ? Object.fromEntries(
        Object.entries(props).filter(([key]) => key !== "children")
      )
    : {};

  const childrenField = children
    ? {
        children: Array.isArray(children)
          ? children.map(debugComponentChild)
          : debugComponentChild(children),
      }
    : {};

  return {
    ...updatedProps,
    ...childrenField,
  };
}

function mapProps(props: Record<string, any>): Record<string, any> {
  return mapAny(props, (value, key) => {
    if (key === "children") {
      if (Array.isArray(value)) {
        return (value as InternalVNode[]).map(debugVNode);
      }
    }

    return value;
  });
}

function mapAny<T, U>(
  value: T | T[] | Record<PropertyKey, T>,
  mapper: (value: T, key: unknown) => U
): Record<PropertyKey, U> | U[] | U {
  if (Array.isArray(value)) {
    return value.map((value, index) => mapper(value, index)) as any;
  } else if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, value]) => [key, mapper(value, key)])
    ) as Record<keyof T, U>;
  } else {
    return mapper(value, null) as U;
  }
}

export interface DisplayStructOptions {
  readonly description: JSONValue;
}

export type Fields = Record<PropertyKey, unknown>;

export function DisplayStruct(
  name: string,
  fields: Record<PropertyKey, unknown>,
  options?: DisplayStructOptions
): object {
  let displayName = name;

  if (options?.description) {
    displayName = `${displayName} [${
      typeof options.description === "string"
        ? options.description
        : JSON.stringify(options.description)
    }]`;
  }

  const constructor = class {};
  Object.defineProperty(constructor, "name", { value: displayName });
  const object = new constructor();

  for (const [key, value] of entries(fields)) {
    Object.defineProperty(object, key, {
      value,
      enumerable: true,
    });
  }

  return object;
}

type Entries<R extends object> = { [P in keyof R]: [P, R[P]] }[keyof R];

function entries<R extends object>(object: R): Entries<R>[] {
  return Object.entries(object) as Entries<R>[];
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
