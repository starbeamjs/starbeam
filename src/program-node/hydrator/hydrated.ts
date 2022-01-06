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
      attr: minimal.Attr;
    };

export const Hydrated = {
  range(start: minimal.Node, end: minimal.Node): Hydrated {
    return { type: "range", range: [start, end] };
  },

  node(node: minimal.Node): Hydrated {
    return { type: "node", node };
  },

  attr(attr: minimal.Attr): Hydrated {
    return { type: "attr", attr };
  },
} as const;
