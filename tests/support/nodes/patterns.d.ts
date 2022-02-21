import type { anydom } from "@domtree/flavors";
export interface ElementNodeOptions {
    attributes?: Record<string, string>;
    children?: readonly NodePattern[];
}
export interface ElementNodePattern {
    type: "element";
    tagName: string;
    options?: ElementNodeOptions;
}
export declare function ElementNode(tagName: string, options?: ElementNodeOptions): ElementNodePattern;
export interface TextNodePattern {
    type: "text";
    value: string;
}
export declare function TextNode(value: string): TextNodePattern;
export interface CommentNodePattern {
    type: "comment";
    value: string;
}
export declare type NodePattern = TextNodePattern | CommentNodePattern | ElementNodePattern;
export declare function expectNode(actual: anydom.Node, pattern: NodePattern): void;
export declare function expectElement(node: anydom.Element, tagName: string, options?: {
    attributes?: Record<string, string>;
    children?: readonly NodePattern[];
}): void;
//# sourceMappingURL=patterns.d.ts.map