import type { minimal } from "@domtree/flavors";
import type { JSDOM } from "jsdom";
import { MinimalDocumentUtilities } from "./streaming/compatible-dom.js";
import { Tokens } from "./streaming/token.js";
export declare abstract class DomEnvironment {
    static jsdom(jsdom: JSDOM): DomEnvironment;
    static browser(window: globalThis.Window): DomEnvironment;
    abstract liveRange(): minimal.LiveRange;
    abstract staticRange(options: minimal.StaticRangeOptions): minimal.StaticRange;
    readonly utils: MinimalDocumentUtilities;
    readonly tokens: Tokens;
}
export interface DomEnvironment {
    readonly document: minimal.Document;
}
