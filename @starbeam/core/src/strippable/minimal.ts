import type * as dom from "@domtree/any";
import type { anydom } from "@domtree/flavors";
import type * as minimal from "@domtree/minimal";
import { expected, isEqual, isPresent } from "@starbeam/verify";

/**
 * @strip.value node
 *
 * @param node
 * @returns
 */
export function mutable<N extends minimal.Node>(node: N): minimal.Mutable<N> {
  return node as unknown as minimal.Mutable<N>;
}

type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

type ReadonlyTuple<T, N extends number> = N extends N
  ? number extends N
    ? readonly T[]
    : _ReadonlyTupleOf<T, N, readonly []>
  : never;
type _ReadonlyTupleOf<
  T,
  N extends number,
  R extends readonly unknown[]
> = R["length"] extends N ? R : _ReadonlyTupleOf<T, N, readonly [T, ...R]>;

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

type MaybeNode = dom.Node | null;

isNode.message = (value: MaybeNode) =>
  value === null
    ? `Expected value to be a node, got null`
    : `Expected value to be a node`;

function nodeMessage(actual: dom.Node | null): string {
  if (isNode(actual)) {
    return describe(actual);
  } else {
    return `null`;
  }
}

function isSpecificNode<T extends minimal.Node>(
  nodeType: number,
  description: string
): (node: MaybeNode) => node is T {
  const isSpecificNode = (node: MaybeNode): node is T => {
    return isNode(node) && node.nodeType === nodeType;
  };

  expected.associate(
    isSpecificNode,
    expected("node").toBe(description).butGot(nodeMessage)
  );

  return isSpecificNode;
}

function isNode(node: MaybeNode): node is minimal.Node {
  return node !== null;
}

function isParentNode(node: MaybeNode): node is minimal.ParentNode {
  if (!isNode(node)) {
    return false;
  }

  return isElement(node) || isDocument(node) || isDocumentFragment(node);
}

expected.associate(isParentNode, expected("node").toBe("parent node"));

const isElement = isSpecificNode<minimal.Element>(1, "an element");
const isText = isSpecificNode<minimal.Text>(3, "a text node");
const isComment = isSpecificNode<minimal.Comment>(8, "a comment node");
const isDocument = isSpecificNode<minimal.Document>(9, "a document");
const isDocumentFragment = isSpecificNode<minimal.DocumentFragment>(
  11,
  "a document fragment"
);

function isCharacterData(
  node: MaybeNode
): node is minimal.Text | minimal.Comment {
  return isText(node) || isComment(node);
}

expected.associate(
  isCharacterData,
  expected("node").toBe("a text or comment node").butGot(nodeMessage)
);

const isAttr = isSpecificNode<minimal.Attr>(2, "an attribute node");

function isTemplateElement(node: MaybeNode): node is minimal.TemplateElement {
  return isElement(node) && hasTagName("template")(node);
}

expected.associate(
  isTemplateElement,
  expected("node").toBe("a template node").butGot(nodeMessage)
);

expected.associate(isPresent, expected("value").toBe("present"));

export function isNullable<In, Out extends In>(
  verifier: (value: In) => value is Out
): (value: In | null) => value is Out | null {
  function verify(input: In | null): input is Out | null {
    if (input === null) {
      return true;
    } else {
      return verifier(input);
    }
  }

  const expectation = expected.updated(verifier, {
    to: (to) => {
      if (to === undefined) {
        return ["to be", "nullable"];
      } else {
        return `${to[1]} or null`;
      }
    },
    actual: (actual) => {
      return (input: In | null) => {
        if (input === null) {
          return "null";
        } else if (actual) {
          return actual(input);
        } else {
          return undefined;
        }
      };
    },
  });

  expected.associate(verify, expectation);

  return verify;
}

export function is<T extends I, I = unknown>(
  predicate: (value: I) => value is T
): (value: I) => value is T {
  function verify(input: I): input is T {
    return predicate(input);
  }

  if (predicate.name) {
    expected.associate(verify, expected.toBe(predicate.name));
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
is.value = isEqual;

// TODO: Deal with SVG and MathML tag names
function hasTagName<T extends string>(
  tagName: T
): (
  value: minimal.Element
) => value is minimal.Element & { readonly tagName: Uppercase<T> } {
  function hasTagName(
    element: minimal.Element
  ): element is minimal.Element & { readonly tagName: Uppercase<T> } {
    return element.tagName === tagName.toUpperCase();
  }

  return expected.associate(
    hasTagName,
    expected("element")
      .toBe(`<${tagName}>`)
      .butGot(
        (element: minimal.Element) => `<${element.tagName.toLowerCase()}>`
      )
  );
}

function hasLength<L extends number>(length: L) {
  function has<T>(value: T[]): value is Tuple<T, L>;
  function has<T>(value: readonly T[]): value is ReadonlyTuple<T, L>;
  function has<T>(value: T[] | readonly T[]): value is Tuple<T, L> {
    return value.length === length;
  }

  return expected.associate(has, expected.toHave(`${length} items`));
}

function hasItems<T>(value: readonly T[]): value is [T, ...(readonly T[])] {
  return value.length > 0;
}

expected.associate(hasItems, expected.toHave(`at least one item`));

interface Typeof {
  string: string;
  boolean: boolean;
  symbol: symbol;
  undefined: undefined;
  object: object | null;
  function: Function;
}

function hasTypeof<T extends keyof Typeof>(
  type: T
): (value: unknown) => value is Typeof[T] {
  function hasTypeof<T extends keyof Typeof>(
    value: unknown
  ): value is Typeof[T] {
    return typeof value === type;
  }

  return expected.associate(
    hasTypeof,
    expected
      .toBe(`typeof ${type}`)
      .butGot((actual) => `a value with typeof ${typeof actual}`)
  );
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
export function minimize<
  N extends anydom.Node | anydom.LiveRange | anydom.StaticRange
>(node: N): dom.Minimal<N> {
  return node as dom.Minimal<N>;
}
