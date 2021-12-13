import type {
  SimpleComment,
  SimpleDocument,
  SimpleDocumentType,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from "@simple-dom/interface";
import {
  Pattern,
  PatternFor,
  PatternImpl,
  PatternMatch,
  PatternMismatch,
  PatternResult,
} from "../../expect";
import { Failure, Mismatch, Success, ValueDescription } from "../../report";

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
} as const;

type NODE_NAMES = typeof NODE_NAMES;

export function nodeName(nodeType: number): NODE_NAMES[keyof NODE_NAMES] {
  if (nodeType in NODE_NAMES) {
    return NODE_NAMES[nodeType as keyof NODE_NAMES];
  } else {
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
} as const;

export type NODE_TYPES = typeof NODE_TYPES;

interface NodeTypeMismatch {
  type: "node-type-mismatch";
  expected: number;
  actual: number;
}

function NodeTypeMismatch(
  actual: number,
  expected: number
): PatternMismatch<NodeTypeMismatch> {
  return PatternMismatch({ type: "node-type-mismatch", expected, actual });
}

export type NodeTypePattern<T extends SimpleNode> = Pattern<
  SimpleNode,
  T,
  NodeTypeMismatch
>;

function NodeTypePattern<T extends SimpleNode>(
  patternName: string,
  nodeType: number
): NodeTypePattern<T> {
  let nodeClass = nodeName(nodeType);
  let description = `A ${nodeClass} node (nodeType = ${nodeType})`;
  let details = {
    name: patternName,
    description,
  } as const;

  return {
    details,

    check(actual: SimpleNode): PatternResult<NodeTypeMismatch> {
      if (actual.nodeType !== nodeType) {
        return NodeTypeMismatch(actual.nodeType, nodeType);
      } else {
        return PatternMatch();
      }
    },

    success(): Success {
      return Success({
        pattern: details,
        message: `node was a ${nodeClass}`,
      });
    },

    failure(actual: T, failure: NodeTypeMismatch): Failure {
      return Mismatch({
        actual: ValueDescription(nodeName(actual.nodeType)),
        expected: ValueDescription(nodeName(failure.expected)),
        pattern: details,
      });
    },
  };
}

export function isElement(): PatternFor<NodeTypePattern<SimpleElement>> {
  return PatternImpl.of(NodeTypePattern("isElementNode", 1));
}

export function isAttribute(): PatternFor<NodeTypePattern<SimpleElement>> {
  return PatternImpl.of(NodeTypePattern("isAttributeNode", 2));
}

export function isDocumentFragment(): PatternFor<
  NodeTypePattern<SimpleElement>
> {
  return PatternImpl.of(NodeTypePattern("isDocumentFragment", 11));
}

export function isDocument(): PatternFor<NodeTypePattern<SimpleDocument>> {
  return PatternImpl.of(NodeTypePattern("isDocumentFragment", 9));
}

export function isDoctype(): PatternFor<NodeTypePattern<SimpleDocumentType>> {
  return PatternImpl.of(NodeTypePattern("isDoctype", 10));
}

export function isTextNode(): PatternFor<NodeTypePattern<SimpleText>> {
  return PatternImpl.of(NodeTypePattern("isTextNode", 3));
}

export function isCommentNode(): PatternFor<NodeTypePattern<SimpleComment>> {
  return PatternImpl.of(NodeTypePattern("isCommentNode", 8));
}
