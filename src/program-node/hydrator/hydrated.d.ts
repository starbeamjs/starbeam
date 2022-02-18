import type * as minimal from "@domtree/minimal";
export declare type Hydrated = {
    type: "range";
    range: [start: minimal.Node, end: minimal.Node];
} | {
    type: "node";
    node: minimal.Node;
} | {
    type: "attr";
    attr: minimal.Attr;
};
export declare const Hydrated: {
    readonly range: (start: minimal.Node, end: minimal.Node) => Hydrated;
    readonly node: (node: minimal.Node) => Hydrated;
    readonly attr: (attr: minimal.Attr) => Hydrated;
};
