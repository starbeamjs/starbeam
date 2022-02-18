import { createContext, createElement, useMemo, } from "react";
import { DomEnvironment, Root } from "starbeam";
import { useSSR } from "use-ssr";
export const STARBEAM = createContext(null);
export function Starbeam({ document, children, }) {
    let root = useMemo(() => {
        let environment = inferEnvironment(document);
        return Root.environment(environment);
    }, []);
    // TODO: Error boundary
    return createElement(STARBEAM.Provider, { value: root }, children);
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
//# sourceMappingURL=component.js.map