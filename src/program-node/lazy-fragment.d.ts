import type { minimal } from "@domtree/flavors";
import type { DomEnvironment } from "../dom.js";
import type { ContentRange } from "../dom/streaming/compatible-dom.js";
import type { LazyDOM } from "../dom/streaming/token.js";
export declare class LazyFragment {
    #private;
    static of(lazy: LazyDOM<ContentRange>): LazyFragment;
    constructor(lazy: LazyDOM<ContentRange>, placeholder: minimal.ChildNode | null | undefined);
    get environment(): DomEnvironment;
    initialize(inside: minimal.ParentNode): void;
    get(inside: minimal.ParentNode): minimal.ChildNode;
    set(placeholder: minimal.ChildNode | null): void;
}
