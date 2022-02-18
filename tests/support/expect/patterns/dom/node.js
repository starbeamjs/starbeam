import { Described, PatternImpl, PatternMatch, PatternMismatch, } from "../../expect.js";
import { Mismatch, Success, ValueDescription, } from "../../report.js";
const NODE_NAMES = {
    1: "Element",
    2: "Attribute",
    3: "Text",
    4: "CDATASection",
    7: "ProcessingInstruction",
    8: "Comment",
    9: "Document",
    10: "DocumentType",
    11: "DocumentFragment",
};
export function nodeName(nodeType) {
    if (nodeType in NODE_NAMES) {
        return NODE_NAMES[nodeType];
    }
    else {
        throw Error(`Unexpected nodeType (${nodeType})`);
    }
}
export const NODE_TYPES = {
    Element: 1,
    Attribute: 2,
    Text: 3,
    CDATASection: 4,
    ProcessingInstruction: 7,
    Comment: 8,
    Document: 9,
    DocumentType: 10,
    DocumentFragment: 11,
};
function NodeTypeMismatch(actual, expected) {
    return PatternMismatch({ type: "node-type-mismatch", expected, actual });
}
function NodeTypePattern(patternName, nodeType) {
    let nodeClass = nodeName(nodeType);
    let description = `A ${nodeClass} node (nodeType = ${nodeType})`;
    let details = {
        name: patternName,
        description,
    };
    return {
        details,
        check({ value: actual, }) {
            if (actual.nodeType !== nodeType) {
                return NodeTypeMismatch(actual.nodeType, nodeType);
            }
            else {
                return PatternMatch();
            }
        },
        success() {
            return Success({
                pattern: details,
                message: `node was a ${nodeClass}`,
            });
        },
        failure(actual, failure) {
            return Mismatch({
                actual: ValueDescription(nodeName(actual.value.nodeType)),
                expected: ValueDescription(nodeName(failure.expected)),
                pattern: details,
            });
        },
    };
}
export function isElement() {
    return PatternImpl.of(NodeTypePattern("isElementNode", 1));
}
export function isAttribute() {
    return PatternImpl.of(NodeTypePattern("isAttributeNode", 2));
}
export function isDocumentFragment() {
    return PatternImpl.of(NodeTypePattern("isDocumentFragment", 11));
}
export function isDocument() {
    return PatternImpl.of(NodeTypePattern("isDocumentFragment", 9));
}
export function isDoctype() {
    return PatternImpl.of(NodeTypePattern("isDoctype", 10));
}
export function isTextNode() {
    return PatternImpl.of(NodeTypePattern("isTextNode", 3));
}
export function isCommentNode() {
    return PatternImpl.of(NodeTypePattern("isCommentNode", 8));
}
//# sourceMappingURL=node.js.map