import { Root, UNINITIALIZED } from "@starbeam/core";
import { DomEnvironment } from "@starbeam/dom";
import { createContext, createElement, useRef, } from "react";
import { useSSR } from "use-ssr";
export const STARBEAM = createContext(null);
export function Starbeam({ document, children, }) {
    let root = useRef(UNINITIALIZED);
    if (root.current === UNINITIALIZED) {
        let environment = inferEnvironment(document);
        root.current = Root.environment(environment);
    }
    // TODO: Error boundary
    return createElement(STARBEAM.Provider, { value: root.current }, children);
}
function inferEnvironment(document) {
    const ssr = useSSR();
    if (document) {
        return DomEnvironment.window(document.defaultView);
    }
    else if (ssr.isBrowser ||
        // React's own heuristic
        (globalThis.document && globalThis.document.createElement)) {
        return DomEnvironment.window(globalThis);
    }
    else {
        throw Error(`When using Starbeam outside of a browser-like environment, you must specify a 'document' prop, which must correpond to the document that React will render into`);
    }
}
//# sourceMappingURL=provider.js.map