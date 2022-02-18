import { verified, verify } from "../../strippable/assert.js";
import { assert } from "../../strippable/core.js";
import { has, is } from "../../strippable/minimal.js";
import { as } from "../../strippable/verify-context.js";
import { isElement } from "../../utils/dom.js";
import { ContentRange, ContentRangeNode, MINIMAL } from "./compatible-dom.js";
import { Token, tokenId } from "./token.js";
// This might be necessary for some obscure cases where <template> is disallowed
// by comments are allowed. That said, there are some cases where comments are
// also not allowed (RCDATA contexts like `<textarea>`) that require a solution
// as well.
export const COMMENT = {};
export const SINGLE_ELEMENT = {
    start(output, token) {
        output.push(`starbeam-marker:content="${tokenId(token)}"`);
    },
};
export function Body(callback) {
    return callback;
}
export function Element(callback) {
    return callback;
}
function Marker(marker) {
    return marker;
}
export class AttributeMarker {
    forName(qualifiedName) {
        return Marker({
            mark: (buffer, token) => buffer.attr(`data-starbeam-marker:attr:${tokenId(token)}`, qualifiedName),
            hydrator: this,
        });
    }
    hydrate(environment, container, token) {
        let attrName = String.raw `data-starbeam-marker:attr:${tokenId(token)}`;
        let element = findElement(container, attrSelector(attrName));
        let attr = verified(element.getAttributeNode(attrName), is.Present);
        element.removeAttribute(attrName);
        return attr;
    }
}
export const ATTRIBUTE_MARKER = new AttributeMarker();
export class ElementMarker {
    marker = Marker({
        mark: (buffer, token) => buffer.attr("data-starbeam-marker:element", tokenId(token)),
        hydrator: this,
    });
    hydrate(environment, container, token) {
        let element = findElement(container, attrSelector(`data-starbeam-marker:element`, tokenId(token)));
        element.removeAttribute(`data-starbeam-marker:element`);
        return element;
    }
}
export const ELEMENT_MARKER = new ElementMarker().marker;
class RangeMarker {
    marker = Marker({
        mark: (buffer, token, body = (input) => input) => {
            let marked = buffer.element("template", (t) => t.attr("data-starbeam-marker:start", tokenId(token)).empty());
            if (body) {
                body(marked);
            }
            return marked.element("template", (t) => 
            // We need an ending marker to distinguish this text node from other text nodes
            t.attr("data-starbeam-marker:end", tokenId(token)).empty());
        },
        hydrator: this,
    });
}
export class CharacterDataMarker extends RangeMarker {
    hydrate(environment, container, token) {
        let range = Markers.find(container, token).hydrateRange(environment);
        assert(ContentRangeNode.is(range));
        verify(range.node, is.CharacterData);
        return range.node;
    }
}
export const CHARACTER_DATA_MARKER = new CharacterDataMarker().marker;
export class ContentRangeMarker extends RangeMarker {
    hydrate(environment, container, token) {
        return Markers.find(container, token).hydrateRange(environment);
    }
}
export const CONTENT_RANGE_MARKER = new ContentRangeMarker().marker;
class Markers {
    static find(container, token) {
        let start = findElement(container, attrSelector(`data-starbeam-marker:start`, tokenId(token)));
        let end = findElement(container, attrSelector(`data-starbeam-marker:end`, tokenId(token)));
        verify(start, is.TemplateElement);
        verify(end, is.TemplateElement);
        return new Markers(start, end);
    }
    #start;
    #end;
    constructor(start, end) {
        this.#start = start;
        this.#end = end;
    }
    hydrateRange(environment) {
        let first = this.#start.nextSibling;
        let last = this.#end.previousSibling;
        if (first === this.#end) {
            MINIMAL.remove(this.#start);
            return MINIMAL.replace(this.#end, (cursor) => {
                let comment = environment.document.createComment("");
                MINIMAL.insert(comment, cursor);
                return ContentRange.empty(comment);
            });
        }
        else {
            verify(first, is.Present);
            verify(last, is.Present);
            MINIMAL.remove(this.#start);
            MINIMAL.remove(this.#end);
            return ContentRange.from(first, last);
        }
    }
}
export function attrSelector(attr, value) {
    let escapedName = attr.replace(/:/g, String.raw `\:`);
    if (value === undefined) {
        return `[${escapedName}]`;
    }
    else {
        let escapedValue = value.replace(/"/g, String.raw `\"`);
        return `[${escapedName}="${escapedValue}"]`;
    }
}
export function findElement(container, selector) {
    let elements = [...findElements(container, selector)];
    verify(elements, has.length(1), as(`${selector} in ${container}`));
    verify(elements[0], is.Element, as(`the first child of ${container}`));
    return elements[0];
}
export function findElements(container, selector) {
    function* iterate() {
        if (isElement(container) && container.matches(selector)) {
            yield container;
        }
        yield* container.querySelectorAll(selector);
    }
    return iterate();
}
//# sourceMappingURL=marker.js.map