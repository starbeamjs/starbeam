import type * as minimal from "@domtree/minimal";
import type { Mutable } from "@domtree/minimal";
import type { CompatibleNode } from "../dom/streaming/compatible-dom";
import { Verifier, PartialVerifier, DebugInformation } from "./assert";
import { expected, VerifyContext } from "./verify-context";

/**
 * @strip.value node
 *
 * @param node
 * @returns
 */
export function mutable<N extends minimal.Node>(node: N): Mutable<N> {
  return node as unknown as Mutable<N>;
}

type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

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
} as const;

function describe(node: minimal.Node): string {
  let [article, title] = NODE_NAMES[node.nodeType];

  return `${article} ${title} node`;
}

export type ELEMENT_NODE = 1;
export type ATTRIBUTE_NODE = 2;
export type TEXT_NODE = 3;
export type CDATA_SECTION_NODE = 4;
export type PROCESSING_INSTRUCTION_NODE = 7;
export type COMMENT_NODE = 8;
export type DOCUMENT_NODE = 9;
export type DOCUMENT_TYPE_NODE = 10;
export type DOCUMENT_FRAGMENT_NODE = 11;

type MaybeNode = CompatibleNode | minimal.Node | null;

isNode.message = (value: MaybeNode) =>
  value === null
    ? `Expected value to be a node, got null`
    : `Expected value to be a node`;

function nodeMessage(
  expected: string
): (
  context: VerifyContext,
  actual: CompatibleNode | minimal.Node | null
) => DebugInformation {
  return (context, actual) => {
    if (isNode(actual)) {
      return `Expected ${
        context.expected
      } to be ${expected}, but it was ${describe(actual)}`;
    } else {
      return `Expected ${context.expected} to be ${expected}, but it was not a node`;
    }
  };
}

function isSpecificNode<T extends minimal.Node>(
  nodeType: number,
  description: string
): Verifier<MaybeNode, T> {
  const isSpecificNode = ((node: MaybeNode): node is T => {
    return isNode(node) && node.nodeType === nodeType;
  }) as PartialVerifier<MaybeNode, T>;

  Verifier.implement(isSpecificNode, expected("node").toBe(description));

  return isSpecificNode as Verifier<MaybeNode, T>;
}

function isNode(node: MaybeNode): node is minimal.Node {
  return node !== null;
}

const isElement = isSpecificNode<minimal.Element>(1, "an element");
const isText = isSpecificNode<minimal.Text>(3, "a text node");
const isComment = isSpecificNode<minimal.Comment>(8, "a comment node");

function isCharacterData(
  node: MaybeNode
): node is minimal.Text | minimal.Comment {
  return isText(node) || isComment(node);
}

isCharacterData.default = { expected: "node" };
isCharacterData.message = nodeMessage("a text or comment node");

const isAttr = isSpecificNode<minimal.Attr>(2, "an attribute node");

function isTemplate(node: MaybeNode): node is minimal.TemplateElement {
  return isElement(node) && hasTagName("template")(node);
}

isTemplate.default = { expected: "node" } as const;
isTemplate.message = nodeMessage("a template node");

export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

Verifier.implement(isPresent, expected("value").toBe("present"));

export function isNullable<In, Out extends In>(
  verifier: Verifier<In, Out>
): Verifier<In | null, Out | null> {
  function verify(input: In | null): input is Out | null {
    if (input === null) {
      return true;
    } else {
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
  Verifier.implement<In | null, Out | null>(verify, context as any);
  return verify;
}

export const is = {
  Node: isNode,
  Element: isElement,
  Text: isText,
  Comment: isComment,
  CharacterData: isCharacterData,
  Attr: isAttr,
  Template: isTemplate,

  Present: isPresent,

  nullable: isNullable,
} as const;

// TODO: Deal with SVG and MathML tag names
function hasTagName<T extends string>(
  tagName: T
): Verifier<
  minimal.Element,
  minimal.Element & { readonly tagName: Uppercase<T> }
> {
  function hasTagName(
    element: minimal.Element
  ): element is minimal.Element & { readonly tagName: Uppercase<T> } {
    return element.tagName === tagName.toUpperCase();
  }

  hasTagName.default = { expected: "element" };
  hasTagName.message = (context: VerifyContext, element: minimal.Element) =>
    `Expected ${
      context.expected
    } to be <${tagName}>, but was <${element.tagName.toLowerCase()}>`;

  return hasTagName;
}

function hasLength<L extends number>(length: L) {
  function has<T>(value: T[]): value is Tuple<T, L> {
    return value.length === length;
  }

  Verifier.implement<unknown[], Tuple<unknown, L>>(
    has,
    expected("value").toHave(`${length} items`)
  );

  return has;
}

interface Typeof {
  string: string;
  boolean: boolean;
  symbol: symbol;
  undefined: undefined;
  object: object | null;
  function: Function;
}

// TODO: Deal with SVG and MathML tag names
function hasTypeof<T extends keyof Typeof>(
  type: T
): Verifier<unknown, Typeof[T]> {
  function hasTypeof<T extends keyof Typeof>(
    value: unknown
  ): value is Typeof[T] {
    return typeof value === type;
  }

  Verifier.implement(
    hasTypeof,
    expected(`value`)
      .toBe(`typeof ${type}`)
      .butGot((actual) => `a value with typeof ${typeof actual}`)
  );

  return hasTypeof;
}

export const has = {
  tagName: hasTagName,
  length: hasLength,
  typeof: hasTypeof,
};
