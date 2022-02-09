import { Attributes, AttributeValue } from "./attribute.js";
export interface SerializeOptions {
    prefix: string;
}
export interface Serialize {
    /**
     * The `prefix` option instructs the serializeInto function to insert a
     * prefix, but only if there is anything to serialize.
     */
    serializeInto(buffer: Buffer, options?: SerializeOptions): void;
}
export declare class Buffer implements Serialize {
    #private;
    static empty(): Buffer;
    constructor(parts: string[]);
    append(part: string): void;
    appending<T>(value: T | null, callback: (value: T) => void, options: SerializeOptions | null): void;
    serializeInto(buffer: Buffer): void;
    serialize(): string;
}
export interface TrustedHTML {
    todo: "TrustedHTML";
}
export interface ContentBuffer {
    html(html: TrustedHTML): this;
    text(data: string): this;
    comment(data: string): this;
    element(tag: string, build: (builder: ElementHeadBuffer) => ElementBodyBuffer | void): this;
}
export interface ElementState {
    readonly tag: string;
    readonly buffer: Buffer;
}
export interface ElementBodyState extends ElementState {
    readonly content: HtmlBuffer;
}
export declare class ElementBodyBuffer implements ContentBuffer {
    #private;
    static create(state: ElementState): ElementBodyBuffer;
    static flush(builder: ElementBodyBuffer): void;
    private constructor();
    empty(): this;
    html(html: TrustedHTML): this;
    text(data: string): this;
    comment(data: string): this;
    element(tag: string, build: (builder: ElementHeadBuffer) => ElementBodyBuffer | void): this;
}
export declare type ElementBody = "normal" | "void" | "self-closing";
export interface ElementOptions {
    readonly body: ElementBody;
}
export declare class HtmlBuffer implements ContentBuffer {
    #private;
    static create(): HtmlBuffer;
    static of(buffer: Buffer): HtmlBuffer;
    private constructor();
    html(_data: TrustedHTML): this;
    text(data: string): this;
    comment(data: string): this;
    element(tag: string, build: (builder: ElementHeadBuffer) => ElementBodyBuffer | void): this;
    serialize(): string;
}
export declare class ElementHeadBuffer {
    #private;
    static tagged(tag: string, buffer: Buffer): ElementHeadBuffer;
    private constructor();
    attrs(map: Attributes): this;
    attr(qualifiedName: string, attrValue: string | null | AttributeValue): this;
    idempotentAttr(qualifiedName: string, attrValue: string | null): this;
    concatAttr(qualifiedName: string, value: string, separator: string): this;
    /**
     * This is for splattributes
     */
    mergeAttr(qualifiedName: string, value: string | null): this;
    body(): ElementBodyBuffer;
    empty(type?: ElementBody): void;
}
