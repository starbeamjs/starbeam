import type * as minimal from "@domtree/minimal";
import type { AttributeValue, AttrType } from "../buffer/attribute.js";
import type { ElementHeadBuffer } from "../buffer/body.js";
import { type ContentBuffer, type ElementBody, ElementBodyBuffer, HtmlBuffer } from "../buffer/body.js";
import type { DomEnvironment } from "../environment.js";
import type { ContentRange } from "./compatible-dom.js";
import type { ContentCursor } from "./cursor.js";
import type { Dehydrated, Tokens } from "./token.js";
export declare type ContentOperationOptions = {
    readonly token: true;
};
export declare const ContentOperationOptions: {
    readonly requestedToken: (options: ContentOperationOptions | undefined) => boolean;
};
export declare const TOKEN: ContentOperationOptions;
export interface BuildElement {
    head: (buffer: HeadConstructor) => void;
    body: (buffer: TreeConstructor) => void;
}
export declare class ElementHeadConstructor {
    #private;
    static create(tokens: Tokens, buffer: ElementHeadBuffer): ElementHeadConstructor;
    constructor(tokens: Tokens, buffer: ElementHeadBuffer);
    get environment(): DomEnvironment;
    attr(qualifiedName: string, attrValue: string | null | AttributeValue, options: ContentOperationOptions): Dehydrated<minimal.Attr>;
    attr(qualifiedName: string, attrValue: string | null | AttributeValue): void;
    body(): ElementBodyConstructor;
    body(construct: (body: ElementBodyConstructor) => void): void;
    empty(type?: ElementBody): void;
}
export declare const ElementBodyConstructor: {
    readonly flush: (content: ElementBodyConstructor) => void;
};
export declare class ContentConstructor<B extends ContentBuffer = ContentBuffer> {
    #private;
    static create<B extends ContentBuffer>(tokens: Tokens, buffer: B): ContentConstructor<B>;
    static finalize<B extends ContentBuffer>(content: ContentConstructor<B>): B;
    constructor(tokens: Tokens, buffer: B);
    fragment<T>(contents: (buffer: ContentConstructor<B>) => T): {
        range: Dehydrated<ContentRange>;
        result: T;
    };
    text(data: string, options: ContentOperationOptions): Dehydrated<minimal.Text>;
    text(data: string): void;
    comment(data: string, options: ContentOperationOptions): Dehydrated<minimal.Comment>;
    comment(data: string): void;
    element<T>(tag: string, construct: (head: ElementHeadConstructor) => T): T;
    element<T, U>(tag: string, construct: (head: ElementHeadConstructor) => T, token: (token: Dehydrated<minimal.Element>, result: T) => U): U;
}
export declare type ElementBodyConstructor = ContentConstructor<ElementBodyBuffer>;
/**
 * `TreeConstructor` builds up a valid string of HTML, which it then gives to the browsers'
 */
export declare class TreeConstructor extends ContentConstructor<HtmlBuffer> {
    #private;
    readonly environment: DomEnvironment;
    static html(environment: DomEnvironment): TreeConstructor;
    private constructor();
    insertAt(cursor: ContentCursor): void;
    replace(placeholder: minimal.TemplateElement): void;
}
export interface ConstructAttr {
    /**
     * Qualified Name
     */
    name: string;
    value: string | null;
    type?: AttrType;
}
export declare class HeadConstructor {
    #private;
    static of(buffer: ElementHeadBuffer, tokens: Tokens): HeadConstructor;
    private constructor();
    attr(construct: ConstructAttr): void;
    attr(construct: ConstructAttr, token: ContentOperationOptions): Dehydrated;
}
export declare type Range = {
    type: "range";
    start: minimal.Node;
    end: minimal.Node;
} | {
    type: "node";
    node: minimal.Node;
};
