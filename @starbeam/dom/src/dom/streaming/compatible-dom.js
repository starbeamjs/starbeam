import { exhaustive, is, minimize, mutable, tap, verified, verify, } from "@starbeam/core";
import { ContentCursor, RangeSnapshot } from "./cursor.js";
import { HTML_NAMESPACE, MATHML_NAMESPACE, SVG_NAMESPACE, XLINK_NAMESPACE, XMLNS_NAMESPACE, XML_NAMESPACE, } from "./namespaces.js";
export const RangeNodes = {
    asSingle(nodes) {
        let [first, last] = nodes;
        if (last === undefined || first === last) {
            return first;
        }
        else {
            return null;
        }
    },
};
export class ContentRange {
    static from(...[first, last]) {
        if (last && first !== last) {
            return ContentRangeNodes.create(first, last);
        }
        else {
            return ContentRangeNode.create(first);
        }
    }
    static empty(comment) {
        return EmptyContentRange.of(comment);
    }
    mutate(environment) {
        return MutateContentRange.create(MinimalDocumentUtilities.of(environment), this.start, this.end);
    }
    snapshot(environment) {
        let [start, end] = this.toContentRange();
        return RangeSnapshot.create(environment, start, end);
    }
    asNode() {
        let [start, end] = this.toContentRange();
        if (end === undefined || start === end) {
            return start;
        }
        else {
            return null;
        }
    }
    toStaticRange() {
        let [start, end] = this.toContentRange();
        return new global.StaticRange({
            startContainer: start,
            endContainer: (end ?? start),
            startOffset: 0,
            endOffset: 0,
        });
    }
    get start() {
        return this.toContentRange()[0];
    }
    get end() {
        let [start, end] = this.toContentRange();
        return end ?? start;
    }
    get before() {
        let end = this.end;
        return ContentCursor.create(verified(end.parentNode, is.Present), end.nextSibling);
    }
    get after() {
        let start = this.start;
        return ContentCursor.create(verified(start.parentNode, is.Present), start);
    }
}
export class MutateContentRange {
    static create(minimal, start, end) {
        return new MutateContentRange(minimal, start, end);
    }
    #minimal;
    #start;
    #end;
    constructor(minimal, start, end) {
        this.#minimal = minimal;
        this.#start = start;
        this.#end = end;
    }
    toLiveRange() {
        return this.#minimal.rangeAround(this.#start, this.#end);
    }
    remove() {
        return tap(ContentCursor.create(verified(this.#start.parentNode, is.Present), this.#start.nextSibling), () => this.toLiveRange().deleteContents());
    }
}
export class ContentRangeNodes extends ContentRange {
    static create(first, last) {
        return new ContentRangeNodes([first, last]);
    }
    type = "nodes";
    #nodes;
    constructor(nodes) {
        super();
        this.#nodes = nodes;
    }
    toContentRange() {
        return this.#nodes;
    }
}
export class ContentRangeNode extends ContentRange {
    node;
    static is(range) {
        return range instanceof ContentRangeNode;
    }
    static create(node) {
        return new ContentRangeNode(node);
    }
    constructor(node) {
        super();
        this.node = node;
    }
    toContentRange() {
        return [this.node];
    }
}
export class EmptyContentRange extends ContentRangeNode {
    static of(comment) {
        return new EmptyContentRange(comment);
    }
    static is(range) {
        return range instanceof EmptyContentRange;
    }
}
export class AbstractDOM {
    // static of(document: DomDocument): AbstractDOM {
    //   return new AbstractDOM(MinimalUtilities.of(document));
    // }
    // readonly #minimal: MinimalUtilities;
    // private constructor(minimal: MinimalUtilities) {
    //   this.#minimal = minimal;
    // }
    getNodeType(node) {
        verify(node, is.Node);
        return node.nodeType;
    }
    createText(document, data) {
        return document.createTextNode(data);
    }
    createComment(document, data) {
        return document.createComment(data);
    }
    getData(data) {
        return data.data;
    }
    setData(data, value) {
        data.data = value;
    }
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
    createElement(document, qualifiedName, { parent, encoding, }) {
        let ns = getElementNS(parent, qualifiedName, encoding || null);
        return document.createElementNS(ns, qualifiedName);
    }
    updateAttr(attr, value) {
        verify(attr, is.Attr);
        if (value === null) {
            this.removeAttr(attr);
        }
        else {
            mutable(attr).value = value;
        }
    }
    removeAttr(attr) {
        MINIMAL.removeAttr(verified(attr, is.Attr));
    }
    /**
     * This API assumes that a qualifiedName like `xlink:href` was created with
     * the correct namespace.
     *
     * @param element
     * @param qualifiedName
     */
    getAttr(element, qualifiedName) {
        verify(element, is.Element);
        return MINIMAL.getAttr(element, qualifiedName);
    }
    /**
     * This API lightly normalizes [foreign attributes] according to the spec.
     * This allows setAttr and getAttr to both take a `qualifiedName`.
     *
     * [foreign attributes]:
     * https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
     */
    setAttr(element, qualifiedName, value) {
        verify(element, is.Element);
        MINIMAL.setAttr(mutable(element), qualifiedName, value);
    }
    hasAttr(element, qualifiedName) {
        verify(element, is.Element);
        return MINIMAL.hasAttr(element, qualifiedName);
    }
    children(parent) {
        return MINIMAL.children(parent);
    }
    insert(node, { parent, next }) {
        MINIMAL.insert(node, ContentCursor.create(parent, next));
    }
    replace(node, withNode) {
        let cursor = this.remove(node);
        if (!cursor) {
            throw new Error("Unexpected: replace() was called with an element that had no parent.");
        }
        this.insert(withNode, cursor);
    }
    appending(parent) {
        return ContentCursor.create(parent, null);
    }
    remove(child) {
        return MINIMAL.remove(child);
    }
    getTemplateContents(element) {
        return element.content;
    }
}
export const DOM = new AbstractDOM();
export class AbstractDocumentUtilities {
    static of(utils) {
        return new AbstractDocumentUtilities(utils);
    }
    #utils;
    constructor(utils) {
        this.#utils = utils;
    }
}
/**
 * The methods of this class are conveniences, and operate on minimal DOM.
 */
export class MinimalUtilities {
    element(document, parent, tag) {
        return document.createElementNS(HTML_NAMESPACE, tag);
    }
    updateAttr(attr, value) {
        if (value === null) {
            this.removeAttr(attr);
        }
        else {
            mutable(attr).value = value;
        }
    }
    removeAttr(attr) {
        let element = attr.ownerElement;
        if (element) {
            mutable(element).removeAttribute(this.#attrQualifiedName(attr));
        }
    }
    /**
     * This API assumes that a qualifiedName like `xlink:href` was created with
     * the correct namespace.
     *
     * @param element
     * @param qualifiedName
     */
    getAttr(element, qualifiedName) {
        return element.getAttributeNode(qualifiedName);
    }
    /**
     * This API lightly normalizes [foreign attributes] according to the spec.
     * This allows setAttr and getAttr to both take a `qualifiedName`.
     *
     * [foreign attributes]:
     * https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
     */
    setAttr(element, qualifiedName, value) {
        let ns = getAttrNS(element, qualifiedName);
        mutable(element).setAttributeNS(ns, qualifiedName, value);
    }
    hasAttr(element, qualifiedName) {
        return element.hasAttribute(qualifiedName);
    }
    replace(child, atCursor) {
        let parent = verified(child.parentNode, is.ParentNode);
        let next = child.nextSibling;
        child.remove();
        return atCursor(ContentCursor.create(parent, next));
    }
    remove(child) {
        let parent = child.parentNode;
        let next = child.nextSibling;
        child.remove();
        if (parent) {
            return ContentCursor.create(parent, next);
        }
        else {
            return null;
        }
    }
    eachChild(node, each) {
        let current = node.firstChild;
        while (current) {
            let next = current.nextSibling;
            each(current);
            current = next;
        }
    }
    children(parent) {
        let children = [];
        this.eachChild(parent, (node) => children.push(node));
        return children;
    }
    move(node, to) {
        this.insert(node, to);
    }
    insert(node, { parent, next }) {
        parent.insertBefore(node, next);
    }
    #attrQualifiedName(attr) {
        if (attr.prefix) {
            return `${attr.prefix}:${attr.localName}`;
        }
        else {
            return attr.localName;
        }
    }
}
export const MINIMAL = new MinimalUtilities();
export class MinimalDocumentUtilities {
    environment;
    static of(environment) {
        return new MinimalDocumentUtilities(environment);
    }
    constructor(environment) {
        this.environment = environment;
    }
    get document() {
        return this.environment.document;
    }
    createPlaceholder() {
        return this.document.createComment("");
    }
    cursorAsRange(cursor) {
        let { parent, next } = cursor;
        if (next === null) {
            return this.rangeAppendingTo(parent);
        }
        else {
            return this.rangeAround(next);
        }
    }
    rangeAround(first, last = first) {
        return tap(minimize(this.environment.liveRange()), (range) => {
            range.setStartBefore(first);
            range.setEndAfter(last);
        });
    }
    rangeAppendingTo(parent) {
        return tap(minimize(this.environment.liveRange()), (range) => {
            range.selectNodeContents(parent);
            range.collapse();
        });
    }
}
function isHtmlElement(element) {
    return element.namespaceURI === HTML_NAMESPACE;
}
function getElementNS(parent, qualifiedName, encoding) {
    switch (parent.namespaceURI) {
        case SVG_NAMESPACE:
            switch (qualifiedName) {
                case "foreignObject":
                case "desc":
                case "title":
                    return HTML_NAMESPACE;
                default:
                    return SVG_NAMESPACE;
            }
        case MATHML_NAMESPACE:
            if ((qualifiedName === "annotation-xml" && encoding === "text/html") ||
                encoding === "application/xhtml+xml") {
                return HTML_NAMESPACE;
            }
            else {
                return MATHML_NAMESPACE;
            }
        case HTML_NAMESPACE:
            switch (qualifiedName) {
                case "svg":
                    return SVG_NAMESPACE;
                case "math":
                    return MATHML_NAMESPACE;
                default:
                    return HTML_NAMESPACE;
            }
        default:
            exhaustive(parent.namespaceURI, "Element.namespaceURI");
    }
}
function getAttrNS(element, name) {
    if (isHtmlElement(element)) {
        return null;
    }
    switch (name) {
        case "xlink:actuate":
        case "xlink:arcrole":
        case "xlink:href":
        case "xlink:role":
        case "xlink:show":
        case "xlink:title":
        case "xlink:type":
            return XLINK_NAMESPACE;
        case "xml:lang":
        case "xml:space":
            return XML_NAMESPACE;
        case "xmlns":
        case "xmlns:xlink":
            return XMLNS_NAMESPACE;
        default:
            return null;
    }
}
//# sourceMappingURL=compatible-dom.js.map