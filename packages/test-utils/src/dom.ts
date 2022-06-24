import {
  type FunctionComponent,
  type ReactElement,
  type ReactNode,
  createElement,
  Fragment,
  isValidElement,
} from "react";

type PropsFor<E> = typeof createElement extends (
  type: E,
  props: infer Props,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
any
  ? Props
  : // TODO: empty interface means any non-nullish value
    // eslint-disable-next-line @typescript-eslint/ban-types
    {};

interface HtmlProxyFunction<E> {
  (props: PropsFor<E>, children: ReactNode[]): ReactElement;
  (...children: ReactNode[]): ReactElement;
}

// ReactElement | ReactFragment | ReactPortal | boolean | null | string | null | undefined;

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
  [P in string]: HtmlProxyFunction<P>;
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

/* eslint-disable */
export const html: HtmlProxy = new Proxy(() => {}, {
  get: (target, property, receiver) => {
    if (typeof property === "symbol") {
      return Reflect.get(target, property);
    }

    return (...args: any[]) => {
      if (isReactNode(args[0])) {
        return createElement(property, null, ...args);
      } else {
        const [props, ...children] = args;
        return createElement(property, props, children);
      }
    };
  },

  apply: (target, receiver, args) => {},
}) as unknown as HtmlProxy;
/* eslint-enable */

export function el(tag: string | FunctionComponent, children: ReactNode[]) {
  return createElement(tag, null, ...children);
}
