import type { browser } from "@domtree/flavors";
import { Root } from "@starbeam/core";
import { type Context, type PropsWithChildren } from "react";
export declare const STARBEAM: Context<Root>;
export declare function Starbeam({ document, children, }: PropsWithChildren<{
    document?: browser.Document;
}>): import("react").FunctionComponentElement<import("react").ProviderProps<Root>>;
//# sourceMappingURL=provider.d.ts.map