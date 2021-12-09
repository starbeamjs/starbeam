import { SimpleElement, SimpleNode } from "@simple-dom/interface";
import zip from "lodash.zip";
import { dom, starbeam } from "../../support";
import { abstraction } from "../expect/abstraction";

export interface ElementNodeOptions {
  attributes?: Record<string, string>;
  children?: readonly NodePattern[];
}

export interface ElementNodePattern {
  type: "element";
  tagName: string;
  options?: ElementNodeOptions;
}

export function ElementNode(
  tagName: string,
  options?: ElementNodeOptions
): ElementNodePattern {
  return {
    type: "element",
    tagName,
    options,
  };
}

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

export type NodePattern =
  | TextNodePattern
  | CommentNodePattern
  | ElementNodePattern;

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

    case "element": {
      expectNodeIsElement(actual);

      expectElement(actual, pattern.tagName, pattern.options);

      break;
    }

    default: {
      starbeam.exhaustive(pattern, "NodePattern");
    }
  }
}

function expectNodeIsElement(node: SimpleNode): asserts node is SimpleElement {
  expect(node.nodeType).toBe(1);
}

export function expectElement(
  node: dom.SimpleElement,
  tagName: string,
  options?: {
    attributes?: Record<string, string>;
    children?: readonly NodePattern[];
  }
) {
  abstraction(() =>
    expect(
      `<${node.tagName.toLowerCase()}>`,
      `element should be a <${tagName}>`
    ).toBe(`<${tagName.toLowerCase()}>`)
  );

  if (options?.attributes) {
    for (let [name, value] of Object.entries(options.attributes)) {
      abstraction(() =>
        expect(
          node.getAttribute(name),
          `attribute ${name} should be ${value}`
        ).toBe(value)
      );
    }
  }

  abstraction(() => {
    if (options?.children) {
      expect(
        node.childNodes,
        "options.children should be the same length as the element's childNodes"
      ).toHaveLength(options.children.length);

      for (let [childNode, pattern] of zip(node.childNodes, options.children)) {
        abstraction(() => expectNode(childNode!, pattern!));
      }
    }
  });
}
