import { Root } from "@starbeam/core";
import { JSDOM } from "jsdom";
export declare class JsDocument {
    readonly jsdom: JSDOM;
    static create(): JsDocument;
    readonly universe: Root;
    constructor(jsdom: JSDOM);
    get document(): Document;
    get body(): HTMLElement;
    get contents(): string;
    log(): void;
}
//# sourceMappingURL=utils.d.ts.map