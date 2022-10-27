import type { ComponentChild, ComponentChildren } from "preact";
import {} from "util/types";

import { isProbablyVNode } from "./internals.js";
import { InternalComponent } from "./internals/component.js";
import { type InternalPreactVNode, InternalVNode } from "./internals/vnode.js";

function debugComponentChild(child: ComponentChild): unknown {
  if (isProbablyVNode(child)) {
    return InternalVNode.of(child);
  } else {
    return child;
  }
}

export function implementInspect(): void {
  const INSPECT = Symbol.for("nodejs.util.inspect.custom");

  interface Inspectable {
    [INSPECT]?: () => unknown;
  }

  (InternalVNode.prototype as Inspectable)[INSPECT] = function (
    this: InternalVNode
  ): object {
    const { type, dom, props } = this;

    if (typeof props === "string") {
      return DisplayStruct("Text", { data: props });
    }

    const updatedProps = propFields(props);

    const typeField = typeof type === "string" ? {} : { type: type };
    const structOptions =
      typeof type === "string" ? { description: type } : undefined;

    const propsField = isPresent(Object.keys(updatedProps))
      ? { props: updatedProps }
      : {};

    return DisplayStruct(
      "VNode",
      {
        ...typeField,
        ...elementFields(dom),
        ...propsField,
      },
      structOptions
    );
  };

  (InternalComponent.prototype as Inspectable)[INSPECT] =
    function debugComponent(this: InternalComponent): unknown {
      return DisplayStruct("Component", {
        ...propFields(mapProps(this.props)),
        state: this.state,
        vnode: this.vnode,
      });
    };
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

  const updatedProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => key !== "children")
  );

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

function mapProps(props: Record<string, unknown>): Record<string, unknown> {
  return mapAny(props, (value, key) => {
    if (key === "children") {
      if (Array.isArray(value)) {
        return (value as InternalPreactVNode[]).map(InternalVNode.of);
      }
    }

    return value;
  });
}

function mapAny<T, U>(
  value: Record<PropertyKey, T>,
  mapper: (value: T, key: unknown) => U
): Record<PropertyKey, U>;
function mapAny<T, U>(value: T[], mapper: (value: T, key: unknown) => U): U[];
function mapAny<T, U>(value: T, mapper: (value: T, key: unknown) => U): U;
function mapAny<T, U>(
  value: T | T[] | Record<PropertyKey, T>,
  mapper: (value: T, key: unknown) => U
): Record<PropertyKey, U> | U[] | U;
function mapAny<T, U>(
  value: T | T[] | Record<PropertyKey, T>,
  mapper: (value: T, key: unknown) => U
): Record<PropertyKey, U> | U[] | U {
  if (Array.isArray(value)) {
    return value.map((item, index) => mapper(item, index));
  } else if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, mapper(v as T, k)])
    ) as Record<keyof T, U>;
  } else {
    return mapper(value, null);
  }
}

interface DisplayStructOptions {
  readonly description: JSONValue;
}

function DisplayStruct(
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

type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

const EMPTY_LENGTH = 0;

function isPresent<T>(list: readonly T[]): list is readonly [T, ...T[]];
function isPresent<T>(list: T[]): list is [T, ...T[]];
function isPresent<T>(
  list: T[] | readonly T[]
): list is [T, ...T[]] | readonly [T, ...T[]] {
  return list.length > EMPTY_LENGTH;
}
