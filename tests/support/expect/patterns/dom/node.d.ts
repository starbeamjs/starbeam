import type { SimpleComment, SimpleDocument, SimpleDocumentType, SimpleElement, SimpleNode, SimpleText } from "@simple-dom/interface";
import { type Pattern, type PatternFor, PatternMismatch } from "../../expect.js";
declare const NODE_NAMES: {
    readonly 1: "Element";
    readonly 2: "Attribute";
    readonly 3: "Text";
    readonly 4: "CDATASection";
    readonly 7: "ProcessingInstruction";
    readonly 8: "Comment";
    readonly 9: "Document";
    readonly 10: "DocumentType";
    readonly 11: "DocumentFragment";
};
declare type NODE_NAMES = typeof NODE_NAMES;
export declare function nodeName(nodeType: number): NODE_NAMES[keyof NODE_NAMES];
export declare const NODE_TYPES: {
    readonly Element: 1;
    readonly Attribute: 2;
    readonly Text: 3;
    readonly CDATASection: 4;
    readonly ProcessingInstruction: 7;
    readonly Comment: 8;
    readonly Document: 9;
    readonly DocumentType: 10;
    readonly DocumentFragment: 11;
};
export declare type NODE_TYPES = typeof NODE_TYPES;
interface NodeTypeMismatch {
    type: "node-type-mismatch";
    expected: number;
    actual: number;
}
declare function NodeTypeMismatch(actual: number, expected: number): PatternMismatch<NodeTypeMismatch>;
export declare type NodeTypePattern<T extends SimpleNode> = Pattern<SimpleNode, T, NodeTypeMismatch>;
export declare function isElement(): PatternFor<NodeTypePattern<SimpleElement>>;
export declare function isAttribute(): PatternFor<NodeTypePattern<SimpleElement>>;
export declare function isDocumentFragment(): PatternFor<NodeTypePattern<SimpleElement>>;
export declare function isDocument(): PatternFor<NodeTypePattern<SimpleDocument>>;
export declare function isDoctype(): PatternFor<NodeTypePattern<SimpleDocumentType>>;
export declare function isTextNode(): PatternFor<NodeTypePattern<SimpleText>>;
export declare function isCommentNode(): PatternFor<NodeTypePattern<SimpleComment>>;
export {};
//# sourceMappingURL=node.d.ts.map