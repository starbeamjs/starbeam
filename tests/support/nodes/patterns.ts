import type { anydom } from "@domtree/flavors";
import zip from "lodash.zip";
import { exhaustive, verify, is, DOM } from "../../support/starbeam";
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

export function expectNode(actual: anydom.Node, pattern: NodePattern): void {
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
      verify(actual, is.Element);

      expectElement(actual, pattern.tagName, pattern.options);

      break;
    }

    default: {
      exhaustive(pattern, "NodePattern");
    }
  }
}

export function expectElement(
  node: anydom.Element,
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
          DOM.getAttr(node, name),
          `attribute ${name} should be ${value}`
        ).toBe(value)
      );
    }
  }

  abstraction(() => {
    if (options?.children) {
      let children = DOM.children(node);

      expect(
        children,
        "options.children should be the same length as the element's childNodes"
      ).toHaveLength(options.children.length);

      for (let [childNode, pattern] of zip(children, options.children)) {
        abstraction(() => expectNode(childNode!, pattern!));
      }
    }
  });
}
