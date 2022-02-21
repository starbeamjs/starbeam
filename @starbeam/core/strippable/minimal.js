import { isPresent } from "../utils/presence.js";
import { Verifier } from "./assert.js";
import { CreatedContext, expected, VerifyContext } from "./verify-context.js";
/**
 * @strip.value node
 *
 * @param node
 * @returns
 */
export function mutable(node) {
    return node;
}
const NODE_NAMES = {
    1: ["an", "Element"],
    2: ["an", "Attribute"],
    3: ["a", "Text"],
    4: ["a", "CDATA"],
    7: ["a", "Processing Instruction"],
    8: ["a", "Comment"],
    9: ["a", "Document"],
    10: ["a", "Doctype"],
    11: ["a", "Document Fragment"],
};
function describe(node) {
    let [article, title] = NODE_NAMES[node.nodeType];
    return `${article} ${title} node`;
}
isNode.message = (value) => value === null
    ? `Expected value to be a node, got null`
    : `Expected value to be a node`;
function nodeMessage(actual) {
    if (isNode(actual)) {
        return describe(actual);
    }
    else {
        return `null`;
    }
}
function isSpecificNode(nodeType, description) {
    const isSpecificNode = ((node) => {
        return isNode(node) && node.nodeType === nodeType;
    });
    Verifier.implement(isSpecificNode, expected("node").toBe(description).butGot(nodeMessage));
    return isSpecificNode;
}
function isNode(node) {
    return node !== null;
}
function isParentNode(node) {
    if (!isNode(node)) {
        return false;
    }
    return isElement(node) || isDocument(node) || isDocumentFragment(node);
}
Verifier.implement(isParentNode, expected("node").toBe("a ParentNode"));
const isElement = isSpecificNode(1, "an element");
const isText = isSpecificNode(3, "a text node");
const isComment = isSpecificNode(8, "a comment node");
const isDocument = isSpecificNode(9, "a document");
const isDocumentFragment = isSpecificNode(11, "a document fragment");
function isCharacterData(node) {
    return isText(node) || isComment(node);
}
Verifier.implement(isCharacterData, expected("node").toBe("a text or comment node").butGot(nodeMessage));
const isAttr = isSpecificNode(2, "an attribute node");
function isTemplateElement(node) {
    return isElement(node) && hasTagName("template")(node);
}
Verifier.implement(isTemplateElement, expected("node").toBe("a template node").butGot(nodeMessage));
Verifier.implement(isPresent, expected("value").toBe("present"));
export function isNullable(verifier) {
    function verify(input) {
        if (input === null) {
            return true;
        }
        else {
            return verifier(input);
        }
    }
    let context = Verifier.context(verifier).updating({
        relationship: ({ kind, description }) => {
            return { kind, description: `${description} or null` };
        },
    });
    // TODO: Determine whether this any-cast is hiding a real problem. Since
    // nullable is widening the space of allowed types, and `butGot` is only
    // called when the type is outside of the space of allowed types, the original
    // `butGot` should work. However, the type error suggests that there may be a
    // mistake in how the generics are structured.
    Verifier.implement(verify, context);
    return verify;
}
export function isValue(value) {
    function verify(input) {
        return input === value;
    }
    Verifier.implement(verify, expected(`value`)
        .toBe(String(value))
        .butGot((actual) => String(actual)));
    return verify;
}
export function is(predicate) {
    function verify(input) {
        return predicate(input);
    }
    if (predicate.name) {
        Verifier.implement(verify, expected(`value`).toBe(predicate.name));
    }
    return verify;
}
is.Node = isNode;
is.ParentNode = isParentNode;
is.Element = isElement;
is.Text = isText;
is.Comment = isComment;
is.CharacterData = isCharacterData;
is.Attr = isAttr;
is.TemplateElement = isTemplateElement;
is.Present = isPresent;
is.nullable = isNullable;
is.value = isValue;
// TODO: Deal with SVG and MathML tag names
function hasTagName(tagName) {
    function hasTagName(element) {
        return element.tagName === tagName.toUpperCase();
    }
    hasTagName.default = { expected: "element" };
    hasTagName.message = (context, element) => `Expected ${context.expected} to be <${tagName}>, but was <${element.tagName.toLowerCase()}>`;
    return hasTagName;
}
function hasLength(length) {
    function has(value) {
        return value.length === length;
    }
    Verifier.implement(has, expected("value").toHave(`${length} items`));
    return has;
}
function hasItems(value) {
    return value.length > 0;
}
Verifier.implement(hasItems, expected("value").toHave(`at least one item`));
// TODO: Deal with SVG and MathML tag names
function hasTypeof(type) {
    function hasTypeof(value) {
        return typeof value === type;
    }
    Verifier.implement(hasTypeof, expected(`value`)
        .toBe(`typeof ${type}`)
        .butGot((actual) => `a value with typeof ${typeof actual}`));
    return hasTypeof;
}
export const has = {
    tagName: hasTagName,
    length: hasLength,
    items: hasItems,
    typeof: hasTypeof,
};
/**
 * @strip {value} node
 */
export function minimize(node) {
    return node;
}
//# sourceMappingURL=minimal.js.map