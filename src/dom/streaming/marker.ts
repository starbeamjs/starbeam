import type { ContentBuffer, ElementHeadBuffer } from "../cursor/append";
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

export interface BodyTransform {
  <B extends ContentBuffer>(buffer: B): B;
}

export function Transform(
  callback: <B extends ContentBuffer>(buffer: B) => B
): BodyTransform {
  return callback;
}

export interface ContentMarker {
  <Parent extends ContentBuffer>(
    output: Parent,
    token: Token,
    body: BodyTransform
  ): Parent;
}

export function TemplateMarker(namespace: ElementContext): ContentMarker {
  return (output, token, body) => {
    return output.element("template", (t) => {
      let template = t
        .attr("data-starbeam-marker:contents", tokenId(token))
        .body();

      switch (namespace) {
        case "html": {
          return body(template);
        }

        case "svg":
          return template.element("svg", (t) => body(t.body()));

        case "mathml":
          return template.element("math", (t) => body(t.body()));
      }
    });
  };
}

export function AttributeMarker(
  buffer: ElementHeadBuffer,
  token: Token,
  qualifiedName: string
): ElementHeadBuffer {
  return buffer
    .attr("data-starbeam-marker:attrs", "", "idempotent")
    .attr(`data-starbeam-marker:attr:${qualifiedName}`, tokenId(token));
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

export const TEMPLATE_MARKER = TemplateMarker("html");
export const SVG_TEMPLATE_MARKER = TemplateMarker("svg");
export const MATHML_TEMPLATE_MARKER = TemplateMarker("mathml");
