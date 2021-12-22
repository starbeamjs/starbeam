declare module "@domtree/minimal" {
  export type HtmlNamespace = "http://www.w3.org/1999/xhtml";
  export type MathmlNamespace = "http://www.w3.org/1998/Math/MathML";
  export type SvgNamespace = "http://www.w3.org/2000/svg";

  export type ElementNamespace = HtmlNamespace | MathmlNamespace | SvgNamespace;

  export type XlinkNamespace = "http://www.w3.org/1999/xlink";
  export type XmlNamespace = "http://www.w3.org/XML/1998/namespace";
  export type XmlnsNamespace = "http://www.w3.org/2000/xmlns/";

  export type AttributeNamespace =
    | XlinkNamespace
    | XmlNamespace
    | XmlnsNamespace;

  export namespace Node {
    export type ELEMENT_NODE = 1;
    export type ATTRIBUTE_NODE = 2;
    export type TEXT_NODE = 3;
    export type CDATA_SECTION_NODE = 4;
    export type PROCESSING_INSTRUCTION_NODE = 7;
    export type COMMENT_NODE = 8;
    export type DOCUMENT_NODE = 9;
    export type DOCUMENT_TYPE_NODE = 10;
    export type DOCUMENT_FRAGMENT_NODE = 11;
  }

  interface ReadonlyNode {}

  interface ReadonlyParent extends ReadonlyNode {
    readonly firstChild: ChildNode | null;
    readonly lastChild: ChildNode | null;
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
    // The core interface needed for traversing the DOM
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

  export type ParentNode = Element | Document | DocumentFragment;
  export type ChildNode = DocumentType | Element | CharacterData;

  export interface Document extends ReadonlyParent {
    readonly nodeType: Node.DOCUMENT_NODE;

    createElementNS(
      ns: ElementNamespace,
      qualifiedName: string,
      options?: { is: string }
    ): Element;

    createTextNode(data: string): Text;
    createComment(data: string): Comment;
    createDocumentFragment(): DocumentFragment;
  }

  interface MutableDocument extends Document, MutableParent {}

  export interface DocumentType extends ReadonlyChild {
    readonly nodeType: Node.DOCUMENT_TYPE_NODE;

    readonly parentNode: ParentNode | null;
  }

  interface MutableDocumentType extends DocumentType, MutableChild {}

  export interface Element extends ReadonlyParent, ReadonlyChild {
    readonly tagName: string;
    readonly nodeType: Node.ELEMENT_NODE;
    readonly namespaceURI: ElementNamespace;

    hasAttribute(qualifiedName: string): boolean;
    getAttributeNode(qualifiedName: string): Attr | null;
    removeAttribute(qualifiedName: string): void;
  }

  interface MutableElement extends Element, MutableParent, MutableChild {
    setAttributeNS(
      namespace: AttributeNamespace | null,
      qualifiedName: string,
      value: string
    ): void;
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

  export interface CharacterData extends ReadonlyChild {
    readonly nodeType: Node.TEXT_NODE | Node.COMMENT_NODE;

    readonly data: string;
    remove(): void;
  }

  interface MutableCharacterData extends CharacterData, MutableChild {
    data: string;
  }

  export interface DocumentFragment extends ReadonlyParent {
    readonly nodeType: Node.DOCUMENT_FRAGMENT_NODE;
  }

  interface MutableDocumentFragment extends DocumentFragment, MutableParent {}

  export interface Text extends CharacterData {
    readonly nodeType: Node.TEXT_NODE;
  }

  export interface Comment extends CharacterData {
    readonly nodeType: Node.COMMENT_NODE;
  }

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

  export class AbstractRange {
    readonly startContainer: ChildNode;
    readonly startOffset: number;
    readonly endContainer: ChildNode;
    readonly endOffset: number;
    readonly collapsed: boolean;
  }

  export class LiveRange extends AbstractRange {
    constructor();

    setStart(node: ChildNode, offset: number): void;
    setEnd(node: ChildNode, offset: number): void;
    deleteContents(): void;
  }

  export class StaticRange extends AbstractRange {
    constructor(options: StaticRangeOptions);
  }

  export type Node =
    | Document
    | DocumentFragment
    | CharacterData
    | DocumentType
    | Element
    | Attr;

  type NodeType<N extends Node> = N extends Document
    ? "Document"
    : N extends DocumentFragment
    ? "DocumentFragment"
    : N extends CharacterData
    ? "CharacterData"
    : N extends DocumentType
    ? "Doctype"
    : N extends Element
    ? "Element"
    : N extends Attr
    ? "Attribute"
    : never;

  type Mutable<N extends Node> = N extends Document
    ? MutableDocument
    : N extends DocumentFragment
    ? MutableDocumentFragment
    : N extends CharacterData
    ? MutableCharacterData
    : N extends DocumentType
    ? MutableDocumentType
    : N extends Element
    ? MutableElement
    : N extends Attr
    ? MutableAttr
    : never;

  interface MutableNodes {
    Document: MutableDocumentType;
    DocumentFragment: MutableDocumentFragment;
    CharacterData: MutableCharacterData;
    Doctype: MutableDocumentType;
    Element: MutableElement;
    Attribute: MutableAttr;
  }

  // export type Mutable<N extends Node> = MutableNodes[NodeType<N>];
}
