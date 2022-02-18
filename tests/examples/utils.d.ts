import { JSDOM } from "jsdom";
import { Root } from "starbeam";
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
