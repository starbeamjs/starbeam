import type * as minimal from "@domtree/minimal";

export type Hydrated =
  | {
      type: "range";
      range: [start: minimal.Node, end: minimal.Node];
    }
  | {
      type: "node";
      node: minimal.Node;
    }
  | {
      type: "attr";
      element: minimal.Element;
      attr: minimal.Attr;
    };
