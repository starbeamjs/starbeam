import { dom, starbeam } from "../../support";

export interface TextNodePattern {
  type: "text";
  value: string;
}

export function TextNode(value: string): TextNodePattern {
  return {
    type: "text",
    value,
  };
}

export interface CommentNodePattern {
  type: "comment";
  value: string;
}

export type NodePattern = TextNodePattern | CommentNodePattern;

export function expectNode(actual: dom.SimpleNode, pattern: NodePattern): void {
  switch (pattern.type) {
    case "text": {
      expect(actual).toMatchObject({
        nodeType: 3,
        nodeValue: pattern.value,
      });

      break;
    }

    case "comment": {
      expect(actual).toMatchObject({ nodeType: 8, nodeValue: pattern.value });

      break;
    }

    default: {
      starbeam.exhaustive(pattern, "NodePattern");
    }
  }
}
