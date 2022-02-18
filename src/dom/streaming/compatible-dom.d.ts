import type * as dom from "@domtree/any";
import type * as minimal from "@domtree/minimal";
import type { Mutable } from "@domtree/minimal";
import type { DomEnvironment } from "../environment.js";
import { ContentCursor, RangeSnapshot } from "./cursor.js";
declare type RangeNodes = readonly [first: minimal.ChildNode, last?: minimal.ChildNode];
export declare const RangeNodes: {
    asSingle(nodes: RangeNodes): minimal.ChildNode | null;
};
export declare abstract class ContentRange {
    static from(...[first, last]: RangeNodes): ContentRange;
    static empty(comment: minimal.Comment): ContentRange;
    abstract toContentRange(): RangeNodes;
    mutate(environment: DomEnvironment): MutateContentRange;
    snapshot(environment: DomEnvironment): RangeSnapshot;
    asNode(): minimal.ChildNode | null;
    toStaticRange(): minimal.StaticRange;
    get start(): minimal.ChildNode;
    get end(): minimal.ChildNode;
    get before(): ContentCursor;
    get after(): ContentCursor;
}
export declare class MutateContentRange {
    #private;
    static create(minimal: MinimalDocumentUtilities, start: minimal.ChildNode, end: minimal.ChildNode): MutateContentRange;
    private constructor();
    toLiveRange(): minimal.LiveRange;
    remove(): ContentCursor;
}
export declare class ContentRangeNodes extends ContentRange {
    #private;
    static create(first: minimal.ChildNode, last: minimal.ChildNode): ContentRange;
    readonly type = "nodes";
    private constructor();
    toContentRange(): RangeNodes;
}
export declare class ContentRangeNode extends ContentRange {
    readonly node: minimal.ChildNode;
    static is(range: ContentRange): range is ContentRangeNode;
    static create(node: minimal.ChildNode): ContentRangeNode;
    protected constructor(node: minimal.ChildNode);
    toContentRange(): RangeNodes;
}
export declare class EmptyContentRange extends ContentRangeNode {
    static of(comment: minimal.Comment): EmptyContentRange;
    static is(range: ContentRange): range is EmptyContentRange;
}
export declare class AbstractDOM {
    getNodeType(node: dom.Node): number;
    createText(document: dom.Document, data: string): minimal.Text;
    createComment(document: dom.Document, data: string): minimal.Comment;
    getData(data: dom.CharacterData): string;
    setData(data: dom.CharacterData, value: string): void;
    /**
     * ## MathML Integration Points
     *
     * A MathML annotation-xml element is an HTML integration point if it has an
     * `encoding` attribute whose value is either "text/html" or
     * "application/xhtml+xml".
     *
     * Since this is the only part of the HTML tree construction semantics that
     * has different behavior when constructing *elements* based upon an element's
     * attributes, we treat this case as special.
     *
     * Essentially: `annotation-xml[encoding=text/html|application/xhtml+xml]` is
     * treated as if it was a separate *tag*, so that we don't need to pass
     * arbitrary attributes to element-based APIs.
     *
     * Since the identification of HTML integration points occurs prior to
     * processing in the HTML spec, this distinction is semantically important:
     * the `annotation-xml` attribute is identified *prior* to attribute
     * normalization (which occurs once an appropriate insertion mode is
     * determined). This detail makes
     * `annotation-xml[encoding=text/html|application/xhtml+xml]` more like a
     * special syntax for a tag than an element plus an attribute.
     *
     * @param document
     * @param qualifiedName the post-normalization tag name
     * @param options.parent
     * @param options.encoding
     * @returns
     */
    createElement(document: dom.Document, qualifiedName: string, { parent, encoding, }: {
        parent: dom.Element;
        encoding?: string;
    }): minimal.ParentNode;
    updateAttr(attr: dom.Attr, value: string | null): void;
    removeAttr(attr: dom.Attr): void;
    /**
     * This API assumes that a qualifiedName like `xlink:href` was created with
     * the correct namespace.
     *
     * @param element
     * @param qualifiedName
     */
    getAttr(element: dom.Element, qualifiedName: string): minimal.Attr | null;
    /**
     * This API lightly normalizes [foreign attributes] according to the spec.
     * This allows setAttr and getAttr to both take a `qualifiedName`.
     *
     * [foreign attributes]:
     * https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
     */
    setAttr(element: dom.Element, qualifiedName: string, value: string): void;
    hasAttr(element: dom.Element, qualifiedName: string): boolean;
    children(parent: dom.ParentNode): readonly minimal.ChildNode[];
    insert(node: dom.ChildNode | dom.DocumentFragment, { parent, next }: ContentCursor): void;
    replace(node: dom.ChildNode, withNode: dom.ChildNode | dom.DocumentFragment): void;
    appending(parent: dom.ParentNode): ContentCursor;
    remove(child: dom.ChildNode): ContentCursor | null;
    getTemplateContents(element: dom.TemplateElement): minimal.DocumentFragment;
}
export declare const DOM: AbstractDOM;
export declare class AbstractDocumentUtilities {
    #private;
    static of(utils: MinimalDocumentUtilities): AbstractDocumentUtilities;
    private constructor();
}
/**
 * The methods of this class are conveniences, and operate on minimal DOM.
 */
export declare class MinimalUtilities {
    #private;
    element(document: minimal.Document, parent: minimal.ParentNode, tag: "template"): minimal.TemplateElement;
    element(document: minimal.Document, parent: minimal.ParentNode, tag: string): minimal.ParentNode;
    updateAttr(attr: Mutable<minimal.Attr>, value: string | null): void;
    removeAttr(attr: Mutable<minimal.Attr>): void;
    /**
     * This API assumes that a qualifiedName like `xlink:href` was created with
     * the correct namespace.
     *
     * @param element
     * @param qualifiedName
     */
    getAttr(element: minimal.Element, qualifiedName: string): minimal.Attr | null;
    /**
     * This API lightly normalizes [foreign attributes] according to the spec.
     * This allows setAttr and getAttr to both take a `qualifiedName`.
     *
     * [foreign attributes]:
     * https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
     */
    setAttr(element: Mutable<minimal.Element>, qualifiedName: string, value: string): void;
    hasAttr(element: minimal.Element, qualifiedName: string): boolean;
    replace<T>(child: minimal.ChildNode, atCursor: (cursor: ContentCursor) => T): T;
    remove(child: minimal.ChildNode): ContentCursor | null;
    eachChild(node: minimal.ParentNode, each: (node: minimal.ChildNode) => void): void;
    children(parent: minimal.ParentNode): readonly minimal.ChildNode[];
    move(node: minimal.ChildNode | minimal.DocumentFragment, to: ContentCursor): void;
    insert(node: minimal.ChildNode | minimal.DocumentFragment, { parent, next }: ContentCursor): void;
}
export declare const MINIMAL: MinimalUtilities;
export declare class MinimalDocumentUtilities {
    readonly environment: DomEnvironment;
    static of(environment: DomEnvironment): MinimalDocumentUtilities;
    private constructor();
    get document(): minimal.Document;
    createPlaceholder(): minimal.ChildNode;
    cursorAsRange(cursor: ContentCursor): minimal.LiveRange;
    rangeAround(first: minimal.ChildNode, last?: minimal.ChildNode): minimal.LiveRange;
    rangeAppendingTo(parent: minimal.ParentNode): minimal.LiveRange;
}
export {};
