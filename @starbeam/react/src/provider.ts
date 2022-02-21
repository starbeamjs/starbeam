import type { browser } from "@domtree/flavors";
import { DomEnvironment, Root, UNINITIALIZED } from "@starbeam/core";
import {
  createContext,
  createElement,
  useRef,
  type Context,
  type PropsWithChildren,
} from "react";
import { useSSR } from "use-ssr";

export const STARBEAM = createContext(null) as unknown as Context<Root>;

export function Starbeam({
  document,
  children,
}: PropsWithChildren<{ document?: browser.Document }>) {
  let root = useRef(UNINITIALIZED as UNINITIALIZED | Root);

  if (root.current === UNINITIALIZED) {
    let environment = inferEnvironment(document);
    root.current = Root.environment(environment);
  }

  // TODO: Error boundary
  return createElement(STARBEAM.Provider, { value: root.current }, children);
}

function inferEnvironment(document?: browser.Document): DomEnvironment {
  const ssr = useSSR();

  if (document) {
    return DomEnvironment.window(document.defaultView as browser.Window);
  } else if (
    ssr.isBrowser ||
    // React's own heuristic
    (globalThis.document && globalThis.document.createElement)
  ) {
    return DomEnvironment.window(globalThis as browser.Window);
  } else {
    throw Error(
      `When using Starbeam outside of a browser-like environment, you must specify a 'document' prop, which must correpond to the document that React will render into`
    );
  }
}
