// @vitest-environment jsdom

import type {
  FunctionComponent,
  ReactElement,
  ReactHTML,
  ReactNode,
} from "react";
import { createElement, Fragment, isValidElement } from "react";

type ReactProxyFunction<E extends keyof ReactHTML> = ReactHTML[E];

type HtmlProxyFunction<E extends keyof ReactHTML> = ReactProxyFunction<E> &
  ((...children: ReactNode[]) => ReactElement);

// ReactElement | ReactFragment | ReactPortal | boolean | null | string | null
// | undefined;

function isReactNode(value: unknown): value is ReactNode {
  switch (typeof value) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return true;
    case "object": {
      if (value === null) {
        return true;
      } else if (isValidElement(value)) {
        return true;
      }
    }
  }

  return false;
}

type HtmlProxy = {
  [P in keyof ReactHTML]: HtmlProxyFunction<P>;
};

function render<P>(
  component: FunctionComponent<P>,
  props: P,
  ...children: ReactNode[]
): ReactElement;
function render(
  component: FunctionComponent,
  ...children: ReactNode[]
): ReactElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function render(...args: any): ReactElement {
  return createElement(...(args as Parameters<typeof createElement>));
}

export const react = {
  fragment(...children: ReactNode[]): ReactElement {
    return createElement(Fragment, null, ...children);
  },

  render,
} as const;

export const html: HtmlProxy = new Proxy(() => {}, {
  get: (target, property, _receiver) => {
    if (typeof property === "symbol") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return Reflect.get(target, property);
    }

    return (...args: never[]) => {
      const [node] = args;

      if (isReactNode(node)) {
        return createElement(property, null, ...args);
      } else {
        const [props, ...children] = args;
        return createElement(property, props, ...children);
      }
    };
  },

  apply: (_target, _receiver, _args) => {},
}) as unknown as HtmlProxy;

export function el(
  tag: string | FunctionComponent,
  children: ReactNode[],
): ReactElement {
  return createElement(tag, null, ...children);
}
