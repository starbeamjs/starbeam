import type * as dom from "@domtree/interface";
export declare type HtmlNamespace = "http://www.w3.org/1999/xhtml";
export declare type MathmlNamespace = "http://www.w3.org/1998/Math/MathML";
export declare type SvgNamespace = "http://www.w3.org/2000/svg";
export declare type ElementNamespace = HtmlNamespace | MathmlNamespace | SvgNamespace;
export declare type XlinkNamespace = "http://www.w3.org/1999/xlink";
export declare type XmlNamespace = "http://www.w3.org/XML/1998/namespace";
export declare type XmlnsNamespace = "http://www.w3.org/2000/xmlns/";
export declare type AttributeNamespace = XlinkNamespace | XmlNamespace | XmlnsNamespace;
export declare namespace Node {
    type ELEMENT_NODE = 1;
    type ATTRIBUTE_NODE = 2;
    type TEXT_NODE = 3;
    type CDATA_SECTION_NODE = 4;
    type PROCESSING_INSTRUCTION_NODE = 7;
    type COMMENT_NODE = 8;
    type DOCUMENT_NODE = 9;
    type DOCUMENT_TYPE_NODE = 10;
    type DOCUMENT_FRAGMENT_NODE = 11;
}
declare type ReadonlyNode = {};
interface ReadonlyParent extends ReadonlyNode {
    readonly firstChild: ChildNode | null;
    readonly lastChild: ChildNode | null;
    querySelectorAll(selectors: string): Iterable<ChildNode>;
}
interface MutableParent extends ReadonlyParent {
    /**
     * `insertBefore` is the only method you need for insertion.
     *
     * It returns `void` in `@domtree/minimal` because the return value is
     * purely a convenience.
     */
    insertBefore(newChild: Node, refChild: Node | null): void;
}
interface ReadonlyChild extends ReadonlyNode {
    readonly parentNode: ParentNode | null;
    readonly nextSibling: ChildNode | null;
    readonly previousSibling: ChildNode | null;
}
interface MutableChild extends ReadonlyChild {
    /**
     * `remove` is the only method you need for clearing ranges of DOM.
     */
    remove(): void;
    /**
     * replaceWith allows us to replace an element without needing parentNode
     */
    replaceWith(node: Node): void;
}
export interface Document extends ReadonlyParent {
    readonly nodeType: Node.DOCUMENT_NODE;
    createElementNS(ns: ElementNamespace, qualifiedName: string, options?: {
        is: string;
    }): Element;
    createRange(): LiveRange;
    createTextNode(data: string): Text;
    createComment(data: string): Comment;
    createDocumentFragment(): DocumentFragment;
}
interface MutableDocument extends Document, MutableParent {
}
export interface DocumentType extends ReadonlyChild {
    readonly nodeType: Node.DOCUMENT_TYPE_NODE;
    readonly parentNode: ParentNode | null;
}
interface MutableDocumentType extends DocumentType, MutableChild {
}
export interface Element extends ReadonlyParent, ReadonlyChild {
    matches(selectors: string): boolean;
    readonly tagName: string;
    readonly nodeType: Node.ELEMENT_NODE;
    readonly namespaceURI: ElementNamespace;
    hasAttribute(qualifiedName: string): boolean;
    getAttributeNode(qualifiedName: string): Attr | null;
    removeAttribute(qualifiedName: string): void;
    get innerHTML(): string;
    get outerHTML(): string;
}
interface MutableElement extends Element, MutableParent, MutableChild {
    setAttributeNS(namespace: AttributeNamespace | null, qualifiedName: string, value: string): void;
    set innerHTML(html: string);
    set outerHTML(html: string);
}
export interface Attr extends ReadonlyNode {
    readonly nodeType: Node.ATTRIBUTE_NODE;
    readonly ownerElement: Element | null;
    readonly namespaceURI: AttributeNamespace | null;
    readonly prefix: string | null;
    readonly localName: string;
    readonly value: string;
}
interface MutableAttr extends Attr {
    value: string;
}
export interface ReadonlyCharacterData extends ReadonlyChild {
    readonly nodeType: Node.TEXT_NODE | Node.COMMENT_NODE;
    readonly data: string;
    remove(): void;
}
interface MutableCharacterData extends ReadonlyCharacterData, MutableChild {
    data: string;
}
export interface DocumentFragment extends ReadonlyParent {
    readonly nodeType: Node.DOCUMENT_FRAGMENT_NODE;
}
interface MutableDocumentFragment extends DocumentFragment, MutableParent {
}
export interface Text extends ReadonlyCharacterData {
    readonly nodeType: Node.TEXT_NODE;
}
export declare type MutableText = Text & MutableCharacterData;
export interface Comment extends ReadonlyCharacterData {
    readonly nodeType: Node.COMMENT_NODE;
}
export declare type MutableComment = Comment & MutableCharacterData;
export interface TemplateElement extends Element {
    readonly tagName: "TEMPLATE";
    readonly content: DocumentFragment;
}
export interface StaticRangeOptions {
    readonly startContainer: ChildNode;
    readonly startOffset: number;
    readonly endContainer: ChildNode;
    readonly endOffset: number;
}
declare class AbstractRange {
    readonly startContainer: ChildNode;
    readonly startOffset: number;
    readonly endContainer: ChildNode;
    readonly endOffset: number;
    readonly collapsed: boolean;
}
export declare class LiveRange extends AbstractRange {
    constructor();
    setStart(node: ChildNode | Element, offset: number): void;
    setStartBefore(node: ChildNode): void;
    setStartAfter(node: ChildNode): void;
    setEnd(node: ChildNode | Element, offset: number): void;
    setEndBefore(node: ChildNode): void;
    setEndAfter(node: ChildNode): void;
    selectNode(node: ChildNode): void;
    selectNodeContents(node: ParentNode): void;
    collapse(toStart?: boolean): void;
    createContextualFragment(html: string): DocumentFragment;
    extractContents(): DocumentFragment;
    deleteContents(): void;
}
export declare class StaticRange extends AbstractRange {
    constructor(options: StaticRangeOptions);
}
export declare type Mutable<N extends Node> = N extends Document ? MutableDocument : N extends DocumentFragment ? MutableDocumentFragment : N extends Comment ? MutableComment : N extends Text ? MutableText : N extends DocumentType ? MutableDocumentType : N extends Element ? MutableElement : N extends Attr ? MutableAttr : never;
export declare type DomTree = dom.Impl<{
    Node: Node;
    Document: Document;
    DocumentType: DocumentType;
    DocumentFragment: DocumentFragment;
    Text: Text;
    Comment: Comment;
    Element: Element;
    TemplateElement: TemplateElement;
    Attr: Attr;
    StaticRange: StaticRange;
    LiveRange: LiveRange;
}>;
export declare type MutableDomTree = dom.Impl<{
    Document: MutableDocument;
    DocumentType: MutableDocumentType;
    DocumentFragment: MutableDocumentFragment;
    Text: MutableText;
    Comment: MutableComment;
    Element: MutableElement;
    TemplateElement: TemplateElement;
    Attr: MutableAttr;
    StaticRange: StaticRange;
    LiveRange: LiveRange;
}>;
export declare type ParentNode = dom.ParentNode<DomTree>;
export declare type ChildNode = dom.ChildNode<DomTree>;
export declare type CharacterData = dom.CharacterData<DomTree>;
export declare type Node = dom.Node<DomTree>;
export {};
//# sourceMappingURL=index.d.ts.map