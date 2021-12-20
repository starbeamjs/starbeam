import { Token, tokenId } from "./token";

// This might be necessary for some obscure cases where <template> is disallowed
// by comments are allowed. That said, there are some cases where comments are
// also not allowed (RCDATA contexts like `<textarea>`) that require a solution
// as well.
export const COMMENT = {} as const;

export const SINGLE_ELEMENT = {
  start(output: string[], token: Token): void {
    output.push(`starbeam-marker:content="${tokenId(token)}"`);
  },
};

export type ElementContext = "html" | "mathml" | "svg";

export class TemplateMarker {
  readonly #namespace: ElementContext;

  constructor(namespace: ElementContext) {
    this.#namespace = namespace;
  }

  start = (output: string[], token: Token): void => {
    output.push(`<template data-starbeam-marker:contents="${tokenId(token)}">`);

    switch (this.#namespace) {
      case "html":
        break;
      case "svg":
        output.push("<svg>");
      case "mathml":
        output.push("<math>");
    }
  };

  end = (output: string[], _token: Token): void => {
    switch (this.#namespace) {
      case "html":
        break;
      case "svg":
        output.push("</svg>");
      case "mathml":
        output.push("</math>");
    }

    output.push("</template>");
  };
}

/**
 * Mark an element as containing attributes, so it can be quickly identified
 * while tree walking.
 */
export const ATTRIBUTES_MARKER = {
  start(output: string[]): void {
    output.push(` data-starbeam-marker:attrs`);
  },
} as const;

export const ATTRIBUTE_MARKER = {
  start(output: string[], token: Token, attributeName: string): void {
    output.push(
      ` data-starbeam-marker:attr:${attributeName}="${tokenId(token)}"`
    );
  },
} as const;

export const TEMPLATE_MARKER = new TemplateMarker("html");
export const SVG_TEMPLATE_MARKER = new TemplateMarker("svg");
export const MATHML_TEMPLATE_MARKER = new TemplateMarker("mathml");
